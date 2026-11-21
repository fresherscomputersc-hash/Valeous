import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '@/server/db';
import { categories, users } from '@/server/db/schema';
import { hashPassword } from '@/server/lib/crypto';
import { registerAccount } from '@/server/services/auth.service';
import { resolveActorFromCookieValue } from '@/server/auth/session';
import {
  createBusinessProduct,
  updateInfluencerProfileDetails,
} from '@/server/services/marketplace.service';
import {
  applyForProductEnrollment,
  decideEnrollmentByBusiness,
  recordPromoLinkClick,
} from '@/server/services/enrollment.service';
import {
  depositBrandWallet,
  getBusinessWalletOverview,
  getInfluencerPayoutReceipt,
  ingestExternalStoreOrderWebhook,
  listInfluencerSalesAndWallet,
  logOrPreviewPromoSale,
  processPayoutRequestByAdmin,
  requestInfluencerPayout,
  resolvePromoSaleByBusiness,
} from '@/server/services/sales-wallet.service';
import { truncateAllTables } from '../setup';

describe('Integration: Production Wallet, Store Webhook, Hold/Refund, Short-Link & Payout Lifecycle', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('executes full Business Wallet -> Promo Code -> Short-Link -> Webhook -> Hold/Refund -> Payout & UTR Receipt lifecycle', async () => {
    const db = getDb();
    const [cat] = await db
      .insert(categories)
      .values({ name: 'Skincare', slug: 'skincare' })
      .returning();

    const [admin] = await db
      .insert(users)
      .values({
        email: 'admin@test.local',
        passwordHash: await hashPassword('AdminPass123!'),
        displayName: 'Admin',
        role: 'ADMIN',
      })
      .returning();

    const bizAReg = await registerAccount({
      role: 'BUSINESS',
      displayName: 'PureGlow Labs',
      handleOrSlug: 'pureglow-labs',
      email: 'biz.a@test.local',
      password: 'Password123!',
      city: 'Bengaluru',
    });
    const bizBReg = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Other Brand',
      handleOrSlug: 'other-brand',
      email: 'biz.b@test.local',
      password: 'Password123!',
      city: 'Mumbai',
    });
    const infReg = await registerAccount({
      role: 'INFLUENCER',
      displayName: 'Riya Creator',
      handleOrSlug: 'riya',
      email: 'riya@test.local',
      password: 'Password123!',
      niche: 'Beauty',
    });

    const bizAActor = (await resolveActorFromCookieValue(bizAReg.session.cookieValue))!;
    const bizBActor = (await resolveActorFromCookieValue(bizBReg.session.cookieValue))!;
    const infActor = (await resolveActorFromCookieValue(infReg.session.cookieValue))!;

    await updateInfluencerProfileDetails(infActor.influencerProfile!.id, infActor.user.id, {
      displayName: 'Riya Creator',
      bio: 'Skincare & beauty creator sharing honest product tests.',
      niche: 'Beauty',
      followerCount: 25000,
      upiId: 'riya@okaxis',
      panNumber: 'ABCDE1234F',
    });

    const product = await createBusinessProduct(
      bizAActor.businessProfile!.id,
      bizAActor.user.id,
      {
        title: 'Hydra Barrier Cream',
        categoryId: cat!.id,
        description: 'Ceramide barrier moisturizer for daily skincare routines.',
        retailPriceRupees: 1000,
        commissionType: 'FIXED_PER_SALE',
        commissionFixedRupees: 200,
        buyerDiscountPercent: 10,
        promoCodePrefix: 'PURE',
      }
    );

    const applied = await applyForProductEnrollment(
      infActor.influencerProfile!.id,
      infActor.user.id,
      {
        productId: product.id,
        pitchNote: 'Will post a 60s winter skincare routine reel.',
      }
    );

    await expect(
      decideEnrollmentByBusiness({
        enrollmentId: applied.id,
        businessId: bizBActor.businessProfile!.id,
        actorUserId: bizBActor.user.id,
        rawInput: { action: 'APPROVE' },
      })
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });

    const approved = await decideEnrollmentByBusiness({
      enrollmentId: applied.id,
      businessId: bizAActor.businessProfile!.id,
      actorUserId: bizAActor.user.id,
      rawInput: { action: 'APPROVE' },
    });
    expect(approved.promoCode).toBe('PURE-RIYA');

    // Track short-link click on /r/PURE-RIYA
    const clickRedirect = await recordPromoLinkClick({
      code: 'pure-riya',
      ipAddress: '203.0.113.10',
      referer: 'https://instagram.com',
      userAgent: 'Mozilla/5.0',
    });
    expect(clickRedirect.redirectUrl).toContain('promo=PURE-RIYA');

    // Attempting to log a sale before funding Campaign Wallet fails cleanly!
    await expect(
      logOrPreviewPromoSale({
        businessId: bizAActor.businessProfile!.id,
        actorUserId: bizAActor.user.id,
        rawInput: {
          promoCode: 'PURE-RIYA',
          quantity: 2,
          orderReference: 'ORD-900',
        },
      })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_CAMPAIGN_WALLET' });

    // Top up Business A Campaign Wallet with ₹5,000 (500,000 paise)
    await depositBrandWallet({
      businessId: bizAActor.businessProfile!.id,
      actorUserId: bizAActor.user.id,
      rawInput: {
        amountRupees: 5000,
        paymentMethod: 'UPI',
        reference: 'TOPUP-TEST-1',
      },
    });

    // Record immediate CONFIRMED sale (3 units -> ₹600 commission + ₹60 platform fee = ₹660 debit)
    const saleRes = await logOrPreviewPromoSale({
      businessId: bizAActor.businessProfile!.id,
      actorUserId: bizAActor.user.id,
      rawInput: {
        promoCode: 'pure-riya',
        quantity: 3,
        orderReference: 'ORD-901',
      },
    });
    expect(saleRes.mode).toBe('RECORDED');
    expect(saleRes.commissionAmountPaise).toBe(60000);
    expect(saleRes.platformFeePaise).toBe(6000);

    // Duplicate orderReference ORD-901 is rejected!
    await expect(
      logOrPreviewPromoSale({
        businessId: bizAActor.businessProfile!.id,
        actorUserId: bizAActor.user.id,
        rawInput: {
          promoCode: 'PURE-RIYA',
          quantity: 1,
          orderReference: 'ORD-901',
        },
      })
    ).rejects.toMatchObject({ code: 'DUPLICATE_ORDER_REFERENCE', status: 409 });

    // Record a 7-day hold sale (1 unit -> ₹200 commission + ₹20 fee) and then REFUND it!
    const heldSale = await logOrPreviewPromoSale({
      businessId: bizAActor.businessProfile!.id,
      actorUserId: bizAActor.user.id,
      rawInput: {
        promoCode: 'PURE-RIYA',
        quantity: 1,
        orderReference: 'ORD-HOLD-1',
        settlementMode: 'HOLD_7_DAYS',
      },
    });
    expect(heldSale.mode).toBe('RECORDED');
    if (heldSale.mode === 'RECORDED') {
      expect(heldSale.settlementMode).toBe('HOLD_7_DAYS');
    }

    let infWallet = await listInfluencerSalesAndWallet(infActor.influencerProfile!.id);
    expect(infWallet.wallet.pendingClearancePaise).toBe(20000);
    expect(infWallet.wallet.availableBalancePaise).toBe(60000);

    await resolvePromoSaleByBusiness({
      saleId: heldSale.saleId!,
      businessId: bizAActor.businessProfile!.id,
      actorUserId: bizAActor.user.id,
      rawInput: { action: 'REFUND', reason: 'Customer cancelled COD order' },
    });

    infWallet = await listInfluencerSalesAndWallet(infActor.influencerProfile!.id);
    expect(infWallet.wallet.pendingClearancePaise).toBe(0);

    // HMAC-signed Store Order Webhook ingestion!
    const overviewBefore = await getBusinessWalletOverview(
      bizAActor.businessProfile!.id
    );
    const webhookBody = JSON.stringify({
      order_id: 'SHOP-WEBHOOK-77',
      discount_code: 'PURE-RIYA',
      quantity: 1,
    });
    const sig = createHmac('sha256', overviewBefore.wallet.webhookSecret)
      .update(webhookBody)
      .digest('hex');

    const webhookResult = await ingestExternalStoreOrderWebhook({
      webhookKey: overviewBefore.wallet.webhookKey,
      rawBody: webhookBody,
      signatureHeader: sig,
    });
    expect(webhookResult.ignored).toBe(false);

    // Business wallet balance check: ₹5,000 - ₹660 (ORD-901) - ₹220 (SHOP-WEBHOOK-77) = ₹4,120 (412,000 paise)
    const overviewAfter = await getBusinessWalletOverview(
      bizAActor.businessProfile!.id
    );
    expect(overviewAfter.wallet.walletBalancePaise).toBe(412000);

    // Payout race guard: 5 sequential ₹500 withdrawal attempts against ₹800 balance -> ONLY ONE succeeds!
    let succeededPayoutId: string | null = null;
    let succeededCount = 0;
    for (let i = 0; i < 5; i++) {
      try {
        const result = await requestInfluencerPayout(
          infActor.influencerProfile!.id,
          infActor.user.id,
          { amountRupees: 500 }
        );
        if (succeededCount === 0) succeededPayoutId = result.id;
        succeededCount++;
      } catch {
        // balance guard rejected this withdrawal
      }
    }
    expect(succeededCount).toBe(1);
    const payoutId = succeededPayoutId!;

    await processPayoutRequestByAdmin({
      payoutId,
      adminUserId: admin!.id,
      rawInput: { action: 'PAY', paymentReference: 'UTR-778899' },
    });

    const receipt = await getInfluencerPayoutReceipt({
      payoutId,
      viewerRole: 'INFLUENCER',
      viewerInfluencerId: infActor.influencerProfile!.id,
    });
    expect(receipt.paymentReference).toBe('UTR-778899');
    expect(receipt.amountPaise).toBe(50000);
  });
});
