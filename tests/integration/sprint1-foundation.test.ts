import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import {
  branches,
  businessProfiles,
  categories,
  customerProfiles,
  memberships,
  needs,
  offerClaims,
  organisations,
  pcProducts,
  webhookEvents,
} from '@/server/db/schema';
import { generateTotpCode } from '@/server/auth/totp';
import {
  enrollTotpMfa,
  loginUser,
  registerAccount,
  requestPhoneOtp,
  verifyPhoneOtp,
  verifyTotpMfa,
} from '@/server/services/auth.service';
import { createCustomerRequest, saveOfferToPassport } from '@/server/services/customer.service';
import { createBusinessProduct } from '@/server/services/marketplace.service';
import { MockPaymentProvider } from '@/server/payments/mock-provider';
import { POST as webhookPost } from '@/app/api/webhooks/payments/route';
import { startWorker } from '@/workers/index';
import { enqueueTestDelayedJob as enqueueDelayed } from '@/workers/queues';
import { truncateAllTables } from '../setup';

describe('Sprint 1 Foundation: VLS-104, VLS-105, VLS-106, VLS-107, VLS-110', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('VLS-104: pc_products table exists and PRODUCT_COMMERCE_ENABLED is false', async () => {
    const db = getDb();
    const rows = await db.select().from(pcProducts).limit(1);
    expect(Array.isArray(rows)).toBe(true);
    expect(process.env.PRODUCT_COMMERCE_ENABLED ?? 'false').toBe('false');
  });

  it('VLS-105: stores customer needs and passport offers in normalized tables (not JSON)', async () => {
    const db = getDb();
    const reg = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Riya Customer',
      email: 'riya.vls105@example.com',
      password: 'Password123!',
      city: 'Bhubaneswar',
    });

    const bizReg = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Aura Spa',
      handleOrSlug: 'aura-spa',
      email: 'aura.vls105@example.com',
      password: 'Password123!',
      city: 'Bhubaneswar',
    });

    const [cat] = await db.insert(categories).values({ name: 'Spa', slug: 'spa' }).returning();
    const [biz] = await db
      .select()
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, bizReg.user.id));
    expect(biz).toBeDefined();

    const product = await createBusinessProduct(biz!.id, bizReg.user.id, {
      title: 'Aroma Facial 60m',
      categoryId: cat!.id,
      description: 'Relaxing aromatherapy facial session for glowing skin.',
      retailPriceRupees: 1500,
      commissionType: 'FIXED_PER_SALE',
      commissionFixedRupees: 150,
      buyerDiscountPercent: 10,
      promoCodePrefix: 'AURA',
    });

    const [cust] = await db
      .select()
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, reg.user.id));

    await createCustomerRequest(cust!.id, reg.user.id, {
      productId: product.id,
      categoryHint: 'spa',
      pitchNote: 'Looking for weekend facial slot',
      budgetRupees: 1500,
    });
    await saveOfferToPassport(cust!.id, reg.user.id, product.id);

    const needRows = await db.select().from(needs).where(eq(needs.customerId, cust!.id));
    const claimRows = await db
      .select()
      .from(offerClaims)
      .where(eq(offerClaims.customerId, cust!.id));

    expect(needRows).toHaveLength(1);
    expect(claimRows).toHaveLength(1);
    expect(cust!.preferences).toBe('{}');
  });

  it('VLS-106: enforces Phone OTP 5-attempt limit, TOTP MFA, lockout, and Org/Branch RBAC', async () => {
    const reg = await registerAccount({
      role: 'BUSINESS',
      displayName: 'RBAC Org Owner',
      handleOrSlug: 'rbac-org-owner',
      email: 'rbac.vls106@example.com',
      password: 'Password123!',
    });

    // Phone OTP + 5-attempt limit
    const otp = await requestPhoneOtp({ phone: '+919876543210' }, reg.user.id);
    expect(otp.devCode).toMatch(/^\d{6}$/);

    for (let i = 0; i < 5; i++) {
      await expect(
        verifyPhoneOtp({ phone: '+919876543210', code: '000000' })
      ).rejects.toThrow();
    }
    await expect(
      verifyPhoneOtp({ phone: '+919876543210', code: otp.devCode })
    ).rejects.toThrow(/Maximum OTP/i);

    const otp2 = await requestPhoneOtp({ phone: '+919876543210' }, reg.user.id);
    const verified = await verifyPhoneOtp({ phone: '+919876543210', code: otp2.devCode });
    expect(verified.verified).toBe(true);

    // TOTP MFA enroll + verify
    const enrolled = await enrollTotpMfa(reg.user.id);
    const code = generateTotpCode(enrolled.secret);
    const mfaRes = await verifyTotpMfa(reg.user.id, { code });
    expect(mfaRes.mfaEnabled).toBe(true);

    // 5-attempt account lockout
    for (let i = 0; i < 4; i++) {
      await expect(
        loginUser({ email: 'rbac.vls106@example.com', password: 'WrongPassword!' })
      ).rejects.toThrow(/Invalid email or password/i);
    }
    await expect(
      loginUser({ email: 'rbac.vls106@example.com', password: 'WrongPassword!' })
    ).rejects.toThrow(/locked/i);

    // Org/Branch membership table check
    const db = getDb();
    const [org] = await db
      .insert(organisations)
      .values({ legalName: 'RBAC Pvt Ltd', tradeName: 'RBAC Studio' })
      .returning();
    const [branch] = await db
      .insert(branches)
      .values({ organisationId: org!.id, name: 'Saheed Nagar' })
      .returning();
    const [membership] = await db
      .insert(memberships)
      .values({
        userId: reg.user.id,
        organisationId: org!.id,
        branchId: branch!.id,
        orgRole: 'ORG_OWNER',
      })
      .returning();
    expect(membership!.orgRole).toBe('ORG_OWNER');
  });

  it('VLS-107: MockPaymentProvider signs webhooks and /api/webhooks/payments is idempotent', async () => {
    const provider = new MockPaymentProvider();
    const sim = provider.buildSimulatedWebhook({
      scenario: 'duplicate',
      orderId: 'mock_ord_test_1',
      amountPaise: 212400,
    });

    const req1 = new NextRequest('http://localhost:3000/api/webhooks/payments', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-provider-signature': sim.signatureHeader,
      },
      body: sim.rawBody,
    });
    const res1 = await webhookPost(req1);
    const json1 = (await res1.json()) as { received: boolean; duplicate: boolean };
    expect(res1.status).toBe(200);
    expect(json1).toEqual({ received: true, duplicate: false });

    // Duplicate delivery returns 200 with duplicate: true and no extra row
    const req2 = new NextRequest('http://localhost:3000/api/webhooks/payments', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-provider-signature': sim.signatureHeader,
      },
      body: sim.rawBody,
    });
    const res2 = await webhookPost(req2);
    const json2 = (await res2.json()) as { received: boolean; duplicate: boolean };
    expect(res2.status).toBe(200);
    expect(json2).toEqual({ received: true, duplicate: true });

    const db = getDb();
    const rows = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, sim.event.eventId));
    expect(rows).toHaveLength(1);
  });

  it('VLS-110: BullMQ worker boots and processes a delayed test job on Redis 7', async () => {
    const worker = startWorker();
    const completed = new Promise<string>((resolve, reject) => {
      worker.on('completed', (job) => {
        if (job.data.kind === 'test-delayed') {
          resolve(job.data.message);
        }
      });
      worker.on('failed', (_job, err) => reject(err));
    });

    await enqueueDelayed('vls-110-smoke', 100);
    const msg = await completed;
    expect(msg).toBe('vls-110-smoke');
    await worker.close();
  });
});
