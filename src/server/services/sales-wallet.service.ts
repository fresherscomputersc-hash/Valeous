import crypto from 'node:crypto';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getEnv } from '@/lib/env';
import { formatInr, rupeesToPaise } from '@/lib/format';
import { getDb } from '@/server/db';
import {
  auditLogs,
  brandWalletTransactions,
  businessProfiles,
  enrollments,
  influencerProfiles,
  payoutRequests,
  products,
  promoSales,
  sessions,
  users,
} from '@/server/db/schema';
import { recordAuditLog } from '@/server/audit/audit.service';
import {
  createUserNotification,
  notifyAllAdmins,
} from '@/server/services/notification.service';
import {
  adminUserStatusSchema,
  brandWalletTopupSchema,
  bulkPromoSaleSchema,
  logPromoSaleSchema,
  payoutProcessSchema,
  payoutRequestSchema,
  saleResolutionSchema,
} from '@/server/validation/schemas';

export function computeSaleCommissionPaise(params: {
  commissionType: 'FIXED_PER_SALE' | 'PERCENTAGE';
  commissionFixedPaise: number | null;
  commissionPercent: number | null;
  quantity: number;
  grossAmountPaise: number;
}): number {
  if (params.commissionType === 'FIXED_PER_SALE') {
    return (params.commissionFixedPaise ?? 0) * params.quantity;
  }
  return Math.round((params.grossAmountPaise * (params.commissionPercent ?? 0)) / 100);
}

export function computePlatformFeePaise(commissionAmountPaise: number): number {
  const pct = getEnv().PLATFORM_FEE_PERCENT;
  return Math.round((commissionAmountPaise * pct) / 100);
}

export async function getBusinessWalletOverview(businessId: string) {
  const db = getDb();
  const [profile] = await db
    .select({
      id: businessProfiles.id,
      brandName: businessProfiles.brandName,
      gstin: businessProfiles.gstin,
      walletBalancePaise: businessProfiles.walletBalancePaise,
      totalDepositedPaise: businessProfiles.totalDepositedPaise,
      totalSpentPaise: businessProfiles.totalSpentPaise,
      webhookKey: businessProfiles.webhookKey,
      webhookSecret: businessProfiles.webhookSecret,
    })
    .from(businessProfiles)
    .where(eq(businessProfiles.id, businessId))
    .limit(1);

  if (!profile) {
    throw new AppError('NOT_FOUND', 'Business wallet not found.', 404);
  }

  const transactions = await db
    .select()
    .from(brandWalletTransactions)
    .where(eq(brandWalletTransactions.businessId, businessId))
    .orderBy(desc(brandWalletTransactions.createdAt))
    .limit(60);

  return {
    wallet: profile,
    platformFeePercent: getEnv().PLATFORM_FEE_PERCENT,
    transactions: transactions.map((t) => ({
      ...t,
      createdAt: t.createdAt,
    })),
  };
}

export async function depositBrandWallet(params: {
  businessId: string;
  actorUserId: string;
  rawInput: unknown;
}) {
  const parsed = brandWalletTopupSchema.safeParse(params.rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid deposit amount',
      400
    );
  }

  const amountPaise = rupeesToPaise(parsed.data.amountRupees);
  const reference =
    parsed.data.reference ||
    `${parsed.data.paymentMethod}-${Date.now().toString().slice(-8)}`;
  const db = getDb();

  return db.transaction(async (tx) => {
    const locked = await tx
      .select({
        id: businessProfiles.id,
        walletBalancePaise: businessProfiles.walletBalancePaise,
      })
      .from(businessProfiles)
      .where(eq(businessProfiles.id, params.businessId));

    const biz = locked[0];
    if (!biz) {
      throw new AppError('NOT_FOUND', 'Business account not found.', 404);
    }

    const nextBalance = biz.walletBalancePaise + amountPaise;

    await tx
      .update(businessProfiles)
      .set({
        walletBalancePaise: nextBalance,
        totalDepositedPaise: sql`${businessProfiles.totalDepositedPaise} + ${amountPaise}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(businessProfiles.id, params.businessId));

    const [txRow] = await tx
      .insert(brandWalletTransactions)
      .values({
        businessId: params.businessId,
        type: 'DEPOSIT',
        amountPaise,
        balanceAfterPaise: nextBalance,
        reference,
        description: `Campaign wallet deposit via ${parsed.data.paymentMethod}`,
        createdByUserId: params.actorUserId,
      })
      .returning();

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        action: 'BRAND_WALLET_DEPOSIT',
        targetType: 'BUSINESS',
        targetId: params.businessId,
        metadata: { amountPaise, paymentMethod: parsed.data.paymentMethod, reference },
      },
      tx
    );

    return {
      balanceAfterPaise: nextBalance,
      transaction: {
        ...txRow!,
        createdAt: txRow!.createdAt,
      },
    };
  });
}

export async function logOrPreviewPromoSale(params: {
  businessId: string;
  actorUserId: string;
  rawInput: unknown;
  source?: 'MANUAL' | 'CSV_IMPORT' | 'STORE_WEBHOOK';
}) {
  const parsed = logPromoSaleSchema.safeParse(params.rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid promo sale details',
      400
    );
  }

  const input = parsed.data;
  const cleanCode = input.promoCode.trim().toUpperCase();
  const cleanOrderRef = input.orderReference ? input.orderReference.trim() : null;
  const source = params.source || 'MANUAL';
  const db = getDb();

  return db.transaction(async (tx) => {
    const matchRows = await tx
      .select({
        enrollmentId: enrollments.id,
        enrollmentStatus: enrollments.status,
        promoCode: enrollments.promoCode,
        productId: products.id,
        productTitle: products.title,
        productStatus: products.status,
        businessId: products.businessId,
        retailPricePaise: products.retailPricePaise,
        commissionType: products.commissionType,
        commissionFixedPaise: products.commissionFixedPaise,
        commissionPercent: products.commissionPercent,
        buyerDiscountPercent: products.buyerDiscountPercent,
        influencerId: influencerProfiles.id,
        influencerUserId: influencerProfiles.userId,
        influencerHandle: influencerProfiles.handle,
        influencerName: influencerProfiles.displayName,
      })
      .from(enrollments)
      .innerJoin(products, eq(enrollments.productId, products.id))
      .innerJoin(influencerProfiles, eq(enrollments.influencerId, influencerProfiles.id))
      .where(eq(enrollments.promoCode, cleanCode))
      .limit(1);

    const match = matchRows[0];
    if (!match) {
      throw new AppError(
        'INVALID_PROMO_CODE',
        `No active promo code "${cleanCode}" was found.`,
        404
      );
    }

    if (match.businessId !== params.businessId) {
      throw new AppError(
        'WRONG_BUSINESS',
        'This promo code belongs to another business’s product campaign.',
        403
      );
    }

    if (match.enrollmentStatus !== 'APPROVED') {
      throw new AppError(
        'PROMO_CODE_INACTIVE',
        `Promo code "${cleanCode}" is currently ${match.enrollmentStatus.toLowerCase()} and cannot record new sales.`,
        409
      );
    }

    if (cleanOrderRef) {
      const duplicate = await tx
        .select({ id: promoSales.id })
        .from(promoSales)
        .where(
          and(
            eq(promoSales.businessId, params.businessId),
            eq(promoSales.orderReference, cleanOrderRef)
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        throw new AppError(
          'DUPLICATE_ORDER_REFERENCE',
          `Order reference "${cleanOrderRef}" has already been recorded for your brand.`,
          409
        );
      }
    }

    const defaultUnitNetPaise = Math.round(
      (match.retailPricePaise * (100 - match.buyerDiscountPercent)) / 100
    );
    const grossAmountPaise = input.grossAmountRupees
      ? rupeesToPaise(input.grossAmountRupees)
      : defaultUnitNetPaise * input.quantity;

    const commissionAmountPaise = computeSaleCommissionPaise({
      commissionType: match.commissionType as 'FIXED_PER_SALE' | 'PERCENTAGE',
      commissionFixedPaise: match.commissionFixedPaise,
      commissionPercent: match.commissionPercent,
      quantity: input.quantity,
      grossAmountPaise,
    });

    const platformFeePaise = computePlatformFeePaise(commissionAmountPaise);

    if (input.dryRun) {
      return {
        mode: 'PREVIEW' as const,
        promoCode: cleanCode,
        productTitle: match.productTitle,
        influencerHandle: match.influencerHandle,
        influencerName: match.influencerName,
        quantity: input.quantity,
        buyerDiscountPercent: match.buyerDiscountPercent,
        grossAmountPaise,
        commissionType: match.commissionType as 'FIXED_PER_SALE' | 'PERCENTAGE',
        commissionFixedPaise: match.commissionFixedPaise,
        commissionPercent: match.commissionPercent,
        commissionAmountPaise,
        platformFeePaise,
        settlementMode: input.settlementMode,
        saleId: null,
      };
    }

    // Lock business & influencer rows for concurrency-safe wallet updates
    const bizLock = await tx
      .select({
        id: businessProfiles.id,
        walletBalancePaise: businessProfiles.walletBalancePaise,
      })
      .from(businessProfiles)
      .where(eq(businessProfiles.id, params.businessId));
    await tx
      .select({ id: influencerProfiles.id })
      .from(influencerProfiles)
      .where(eq(influencerProfiles.id, match.influencerId));

    const totalBrandDebit = commissionAmountPaise + platformFeePaise;
    const currentBrandWallet = bizLock[0]?.walletBalancePaise ?? 0;

    if (totalBrandDebit > 0 && currentBrandWallet < totalBrandDebit) {
      throw new AppError(
        'INSUFFICIENT_CAMPAIGN_WALLET',
        `Insufficient Campaign Wallet balance (${formatInr(currentBrandWallet)} available, ${formatInr(totalBrandDebit)} required). Please top up your Campaign Wallet first.`,
        402
      );
    }

    if (totalBrandDebit > 0) {
      const nextBrandBalance = currentBrandWallet - totalBrandDebit;
      await tx
        .update(businessProfiles)
        .set({
          walletBalancePaise: nextBrandBalance,
          totalSpentPaise: sql`${businessProfiles.totalSpentPaise} + ${totalBrandDebit}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(businessProfiles.id, params.businessId));

      await tx.insert(brandWalletTransactions).values({
        businessId: params.businessId,
        type: 'SALE_COMMISSION_DEBIT',
        amountPaise: totalBrandDebit,
        balanceAfterPaise: nextBrandBalance,
        reference: cleanOrderRef || cleanCode,
        description: `Promo sale ${cleanCode} (${input.quantity}u) — Creator ${formatInr(commissionAmountPaise)} + Platform fee ${formatInr(platformFeePaise)}`,
        createdByUserId: params.actorUserId,
      });
    }

    const isHold = input.settlementMode === 'HOLD_7_DAYS';
    const saleStatus = isHold ? 'PENDING_CLEARANCE' : 'CONFIRMED';
    const clearsAt = isHold ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;

    const [sale] = await tx
      .insert(promoSales)
      .values({
        enrollmentId: match.enrollmentId,
        productId: match.productId,
        businessId: match.businessId,
        influencerId: match.influencerId,
        promoCodeSnapshot: cleanCode,
        quantity: input.quantity,
        grossAmountPaise,
        commissionAmountPaise,
        platformFeePaise,
        status: saleStatus,
        clearsAt,
        source,
        orderReference: cleanOrderRef,
        customerNote: input.customerNote || null,
        loggedByUserId: params.actorUserId,
      })
      .returning();

    await tx
      .update(enrollments)
      .set({
        totalSalesCount: sql`${enrollments.totalSalesCount} + 1`,
        totalUnitsSold: sql`${enrollments.totalUnitsSold} + ${input.quantity}`,
        totalGrossSalesPaise: sql`${enrollments.totalGrossSalesPaise} + ${grossAmountPaise}`,
        totalCommissionPaise: sql`${enrollments.totalCommissionPaise} + ${commissionAmountPaise}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(enrollments.id, match.enrollmentId));

    if (isHold) {
      await tx
        .update(influencerProfiles)
        .set({
          totalEarnedPaise: sql`${influencerProfiles.totalEarnedPaise} + ${commissionAmountPaise}`,
          pendingClearancePaise: sql`${influencerProfiles.pendingClearancePaise} + ${commissionAmountPaise}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(influencerProfiles.id, match.influencerId));
    } else {
      await tx
        .update(influencerProfiles)
        .set({
          totalEarnedPaise: sql`${influencerProfiles.totalEarnedPaise} + ${commissionAmountPaise}`,
          availableBalancePaise: sql`${influencerProfiles.availableBalancePaise} + ${commissionAmountPaise}`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(influencerProfiles.id, match.influencerId));
    }

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        action: 'PROMO_SALE_RECORDED',
        targetType: 'PROMO_SALE',
        targetId: sale!.id,
        metadata: {
          promoCode: cleanCode,
          quantity: input.quantity,
          grossAmountPaise,
          commissionAmountPaise,
          status: saleStatus,
          source,
        },
      },
      tx
    );

    await createUserNotification(
      {
        userId: match.influencerUserId,
        type: 'PROMO_SALE_EARNED',
        title: `New sale with ${cleanCode}! +${formatInr(commissionAmountPaise)}`,
        body: `${input.quantity} unit(s) of "${match.productTitle}" purchased (${isHold ? '7-day clearance hold' : 'added to available balance'}).`,
        href: '/influencer/earnings',
        sendEmail: true,
      },
      tx
    );

    return {
      mode: 'RECORDED' as const,
      promoCode: cleanCode,
      productTitle: match.productTitle,
      influencerHandle: match.influencerHandle,
      influencerName: match.influencerName,
      quantity: input.quantity,
      buyerDiscountPercent: match.buyerDiscountPercent,
      grossAmountPaise,
      commissionType: match.commissionType as 'FIXED_PER_SALE' | 'PERCENTAGE',
      commissionFixedPaise: match.commissionFixedPaise,
      commissionPercent: match.commissionPercent,
      commissionAmountPaise,
      platformFeePaise,
      settlementMode: input.settlementMode,
      saleId: sale!.id,
    };
  });
}

export async function bulkImportPromoSales(params: {
  businessId: string;
  actorUserId: string;
  rawInput: unknown;
}) {
  const parsed = bulkPromoSaleSchema.safeParse(params.rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid CSV rows',
      400
    );
  }

  let importedCount = 0;
  let totalCommissionPaise = 0;
  const errors: Array<{ row: number; promoCode: string; message: string }> = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i]!;
    try {
      const res = await logOrPreviewPromoSale({
        businessId: params.businessId,
        actorUserId: params.actorUserId,
        source: 'CSV_IMPORT',
        rawInput: {
          promoCode: row.promoCode,
          quantity: row.quantity,
          grossAmountRupees: row.grossAmountRupees,
          orderReference: row.orderReference,
          customerNote: row.customerNote,
          settlementMode: parsed.data.settlementMode,
          dryRun: false,
        },
      });
      importedCount++;
      totalCommissionPaise += res.commissionAmountPaise;
    } catch (err) {
      errors.push({
        row: i + 1,
        promoCode: row.promoCode,
        message: err instanceof Error ? err.message : 'Row failed',
      });
    }
  }

  return {
    importedCount,
    failedCount: errors.length,
    totalCommissionPaise,
    errors,
  };
}

export async function resolvePromoSaleByBusiness(params: {
  saleId: string;
  businessId: string;
  actorUserId: string;
  rawInput: unknown;
}) {
  const parsed = saleResolutionSchema.safeParse(params.rawInput);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Invalid sale resolution action.', 400);
  }

  const input = parsed.data;
  const db = getDb();

  return db.transaction(async (tx) => {
    const locked = await tx
      .select({
        id: promoSales.id,
        enrollmentId: promoSales.enrollmentId,
        businessId: promoSales.businessId,
        influencerId: promoSales.influencerId,
        promoCodeSnapshot: promoSales.promoCodeSnapshot,
        quantity: promoSales.quantity,
        grossAmountPaise: promoSales.grossAmountPaise,
        commissionAmountPaise: promoSales.commissionAmountPaise,
        platformFeePaise: promoSales.platformFeePaise,
        status: promoSales.status,
        orderReference: promoSales.orderReference,
      })
      .from(promoSales)
      .where(eq(promoSales.id, params.saleId));

    const sale = locked[0];
    if (!sale) {
      throw new AppError('NOT_FOUND', 'Sale record not found.', 404);
    }
    if (sale.businessId !== params.businessId) {
      throw new AppError('FORBIDDEN', 'You cannot modify another business’s sale.', 403);
    }
    if (sale.status === 'REFUNDED') {
      throw new AppError('ALREADY_PROCESSED', 'This sale has already been refunded.', 409);
    }

    const infLock = await tx
      .select({
        id: influencerProfiles.id,
        userId: influencerProfiles.userId,
        availableBalancePaise: influencerProfiles.availableBalancePaise,
        pendingClearancePaise: influencerProfiles.pendingClearancePaise,
      })
      .from(influencerProfiles)
      .where(eq(influencerProfiles.id, sale.influencerId));

    const inf = infLock[0]!;
    const now = new Date().toISOString();

    if (input.action === 'CONFIRM') {
      if (sale.status !== 'PENDING_CLEARANCE') {
        throw new AppError('INVALID_STATE_TRANSITION', 'Sale is already confirmed.', 409);
      }

      await tx
        .update(promoSales)
        .set({ status: 'CONFIRMED', clearsAt: now })
        .where(eq(promoSales.id, sale.id));

      await tx
        .update(influencerProfiles)
        .set({
          pendingClearancePaise: sql`GREATEST(0, ${influencerProfiles.pendingClearancePaise} - ${sale.commissionAmountPaise})`,
          availableBalancePaise: sql`${influencerProfiles.availableBalancePaise} + ${sale.commissionAmountPaise}`,
          updatedAt: now,
        })
        .where(eq(influencerProfiles.id, sale.influencerId));

      await recordAuditLog(
        {
          actorUserId: params.actorUserId,
          action: 'PROMO_SALE_CONFIRMED',
          targetType: 'PROMO_SALE',
          targetId: sale.id,
        },
        tx
      );

      await createUserNotification(
        {
          userId: inf.userId,
          type: 'SALE_CLEARANCE_RELEASED',
          title: `Commission unlocked: ${formatInr(sale.commissionAmountPaise)}`,
          body: `Order on ${sale.promoCodeSnapshot} cleared its return window and is now ready for withdrawal.`,
          href: '/influencer/earnings',
        },
        tx
      );

      return { status: 'CONFIRMED' as const };
    }

    // REFUND action
    if (
      sale.status === 'CONFIRMED' &&
      inf.availableBalancePaise < sale.commissionAmountPaise
    ) {
      throw new AppError(
        'INSUFFICIENT_BALANCE',
        'Cannot auto-reverse because the creator has already withdrawn these funds. Contact Admin for ledger adjustment.',
        409
      );
    }

    const reason = input.reason || 'Customer order returned or cancelled';

    await tx
      .update(promoSales)
      .set({
        status: 'REFUNDED',
        refundReason: reason,
        refundedAt: now,
      })
      .where(eq(promoSales.id, sale.id));

    await tx
      .update(enrollments)
      .set({
        totalSalesCount: sql`GREATEST(0, ${enrollments.totalSalesCount} - 1)`,
        totalUnitsSold: sql`GREATEST(0, ${enrollments.totalUnitsSold} - ${sale.quantity})`,
        totalGrossSalesPaise: sql`GREATEST(0, ${enrollments.totalGrossSalesPaise} - ${sale.grossAmountPaise})`,
        totalCommissionPaise: sql`GREATEST(0, ${enrollments.totalCommissionPaise} - ${sale.commissionAmountPaise})`,
        updatedAt: now,
      })
      .where(eq(enrollments.id, sale.enrollmentId));

    if (sale.status === 'PENDING_CLEARANCE') {
      await tx
        .update(influencerProfiles)
        .set({
          totalEarnedPaise: sql`GREATEST(0, ${influencerProfiles.totalEarnedPaise} - ${sale.commissionAmountPaise})`,
          pendingClearancePaise: sql`GREATEST(0, ${influencerProfiles.pendingClearancePaise} - ${sale.commissionAmountPaise})`,
          updatedAt: now,
        })
        .where(eq(influencerProfiles.id, sale.influencerId));
    } else {
      await tx
        .update(influencerProfiles)
        .set({
          totalEarnedPaise: sql`GREATEST(0, ${influencerProfiles.totalEarnedPaise} - ${sale.commissionAmountPaise})`,
          availableBalancePaise: sql`GREATEST(0, ${influencerProfiles.availableBalancePaise} - ${sale.commissionAmountPaise})`,
          updatedAt: now,
        })
        .where(eq(influencerProfiles.id, sale.influencerId));
    }

    // Refund Brand Wallet if brand had spent wallet funds
    const bizRows = await tx
      .select({
        walletBalancePaise: businessProfiles.walletBalancePaise,
        totalSpentPaise: businessProfiles.totalSpentPaise,
      })
      .from(businessProfiles)
      .where(eq(businessProfiles.id, params.businessId))
      .limit(1);

    const refundCredit = sale.commissionAmountPaise + sale.platformFeePaise;
    if (bizRows[0] && bizRows[0].totalSpentPaise >= refundCredit && refundCredit > 0) {
      const nextBal = bizRows[0].walletBalancePaise + refundCredit;
      await tx
        .update(businessProfiles)
        .set({
          walletBalancePaise: nextBal,
          totalSpentPaise: sql`GREATEST(0, ${businessProfiles.totalSpentPaise} - ${refundCredit})`,
          updatedAt: now,
        })
        .where(eq(businessProfiles.id, params.businessId));

      await tx.insert(brandWalletTransactions).values({
        businessId: params.businessId,
        type: 'SALE_REFUND_CREDIT',
        amountPaise: refundCredit,
        balanceAfterPaise: nextBal,
        reference: sale.orderReference || sale.promoCodeSnapshot,
        description: `Refund reversal for cancelled order (${sale.promoCodeSnapshot})`,
        createdByUserId: params.actorUserId,
      });
    }

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        action: 'PROMO_SALE_REFUNDED',
        targetType: 'PROMO_SALE',
        targetId: sale.id,
        reason,
      },
      tx
    );

    await createUserNotification(
      {
        userId: inf.userId,
        type: 'PROMO_SALE_REFUNDED',
        title: `Order reversed on ${sale.promoCodeSnapshot}`,
        body: `${formatInr(sale.commissionAmountPaise)} commission reversed (${reason}).`,
        href: '/influencer/earnings',
      },
      tx,
    );

    return { status: 'REFUNDED' as const };
  });
}

export async function ingestExternalStoreOrderWebhook(params: {
  webhookKey: string;
  rawBody: string;
  signatureHeader: string | null;
}) {
  const db = getDb();
  const [biz] = await db
    .select({
      id: businessProfiles.id,
      userId: businessProfiles.userId,
      webhookSecret: businessProfiles.webhookSecret,
    })
    .from(businessProfiles)
    .where(eq(businessProfiles.webhookKey, params.webhookKey))
    .limit(1);

  if (!biz) {
    throw new AppError('NOT_FOUND', 'Unknown store webhook endpoint.', 404);
  }

  if (!params.signatureHeader) {
    throw new AppError(
      'INVALID_WEBHOOK_SIGNATURE',
      'Missing X-PromoBridge-Signature HMAC header.',
      401
    );
  }

  const expectedHex = crypto
    .createHmac('sha256', biz.webhookSecret)
    .update(params.rawBody, 'utf8')
    .digest('hex');

  const provided = params.signatureHeader.replace(/^sha256=/i, '').trim();
  const safeEqual =
    provided.length === expectedHex.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expectedHex));

  if (!safeEqual) {
    throw new AppError(
      'INVALID_WEBHOOK_SIGNATURE',
      'Invalid webhook HMAC-SHA256 signature.',
      401
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(params.rawBody) as Record<string, unknown>;
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Webhook body must be valid JSON.', 400);
  }

  const promoCode = String(
    payload.promoCode || payload.discount_code || ''
  )
    .trim()
    .toUpperCase();
  if (!promoCode) {
    return { ignored: true, reason: 'No promo code attached to order' };
  }

  try {
    const result = await logOrPreviewPromoSale({
      businessId: biz.id,
      actorUserId: biz.userId,
      source: 'STORE_WEBHOOK',
      rawInput: {
        promoCode,
        quantity: Number(payload.quantity ?? 1),
        grossAmountRupees: payload.grossAmountRupees ?? payload.total_price,
        orderReference: String(payload.orderReference || payload.order_id || ''),
        customerNote: String(payload.customerNote || 'Synced automatically via Store Webhook'),
        settlementMode: payload.settlementMode === 'HOLD_7_DAYS' ? 'HOLD_7_DAYS' : 'INSTANT',
        dryRun: false,
      },
    });

    return { ignored: false, sale: result };
  } catch (err) {
    if (err instanceof AppError && err.code === 'DUPLICATE_ORDER_REFERENCE') {
      return { ignored: true, duplicate: true, reason: err.message };
    }
    throw err;
  }
}

export async function listBusinessPromoSales(
  businessId: string,
  options?: { limit?: number; status?: string; q?: string }
) {
  const db = getDb();
  const limit = options?.limit ?? 100;
  const rows = await db
    .select({
      id: promoSales.id,
      promoCodeSnapshot: promoSales.promoCodeSnapshot,
      quantity: promoSales.quantity,
      grossAmountPaise: promoSales.grossAmountPaise,
      commissionAmountPaise: promoSales.commissionAmountPaise,
      platformFeePaise: promoSales.platformFeePaise,
      status: promoSales.status,
      clearsAt: promoSales.clearsAt,
      refundReason: promoSales.refundReason,
      source: promoSales.source,
      orderReference: promoSales.orderReference,
      customerNote: promoSales.customerNote,
      soldAt: promoSales.soldAt,
      productTitle: products.title,
      influencerHandle: influencerProfiles.handle,
      influencerName: influencerProfiles.displayName,
    })
    .from(promoSales)
    .innerJoin(products, eq(promoSales.productId, products.id))
    .innerJoin(influencerProfiles, eq(promoSales.influencerId, influencerProfiles.id))
    .where(eq(promoSales.businessId, businessId))
    .orderBy(desc(promoSales.soldAt))
    .limit(limit);

  return rows
    .filter((r) => {
      if (options?.status && r.status !== options.status) return false;
      if (options?.q) {
        const needle = options.q.toLowerCase();
        return (
          r.promoCodeSnapshot.toLowerCase().includes(needle) ||
          (r.orderReference || '').toLowerCase().includes(needle) ||
          r.productTitle.toLowerCase().includes(needle) ||
          r.influencerHandle.toLowerCase().includes(needle)
        );
      }
      return true;
    })
    .map((r) => ({
      ...r,
      soldAt: r.soldAt,
      clearsAt: r.clearsAt ?? null,
    }));
}

export async function listInfluencerSalesAndWallet(influencerId: string) {
  const db = getDb();

  const [profileRows, salesRows, payoutRows] = await Promise.all([
    db
      .select()
      .from(influencerProfiles)
      .where(eq(influencerProfiles.id, influencerId))
      .limit(1),
    db
      .select({
        id: promoSales.id,
        promoCodeSnapshot: promoSales.promoCodeSnapshot,
        quantity: promoSales.quantity,
        grossAmountPaise: promoSales.grossAmountPaise,
        commissionAmountPaise: promoSales.commissionAmountPaise,
        status: promoSales.status,
        clearsAt: promoSales.clearsAt,
        refundReason: promoSales.refundReason,
        source: promoSales.source,
        orderReference: promoSales.orderReference,
        soldAt: promoSales.soldAt,
        productTitle: products.title,
        brandName: businessProfiles.brandName,
      })
      .from(promoSales)
      .innerJoin(products, eq(promoSales.productId, products.id))
      .innerJoin(businessProfiles, eq(promoSales.businessId, businessProfiles.id))
      .where(eq(promoSales.influencerId, influencerId))
      .orderBy(desc(promoSales.soldAt))
      .limit(120),
    db
      .select()
      .from(payoutRequests)
      .where(eq(payoutRequests.influencerId, influencerId))
      .orderBy(desc(payoutRequests.requestedAt))
      .limit(60),
  ]);

  const profile = profileRows[0];
  if (!profile) {
    throw new AppError('NOT_FOUND', 'Influencer profile not found.', 404);
  }

  return {
    wallet: {
      totalEarnedPaise: profile.totalEarnedPaise,
      pendingClearancePaise: profile.pendingClearancePaise,
      availableBalancePaise: profile.availableBalancePaise,
      pendingPayoutPaise: profile.pendingPayoutPaise,
      totalPaidPaise: profile.totalPaidPaise,
      upiId: profile.upiId,
      bankAccountNumber: profile.bankAccountNumber,
      bankIfsc: profile.bankIfsc,
      panNumber: profile.panNumber,
      bankDetailsNote: profile.bankDetailsNote,
      minPayoutRupees: getEnv().MIN_PAYOUT_RUPEES,
    },
    sales: salesRows.map((s) => ({
      ...s,
      soldAt: s.soldAt,
      clearsAt: s.clearsAt ?? null,
    })),
    payouts: payoutRows.map((p) => ({
      ...p,
      requestedAt: p.requestedAt,
      processedAt: p.processedAt ?? null,
    })),
  };
}

export async function requestInfluencerPayout(
  influencerId: string,
  actorUserId: string,
  rawInput: unknown
) {
  const parsed = payoutRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid payout amount',
      400
    );
  }

  const minRupees = getEnv().MIN_PAYOUT_RUPEES;
  if (parsed.data.amountRupees < minRupees) {
    throw new AppError(
      'PAYOUT_BELOW_MINIMUM',
      `Minimum withdrawal amount is ₹${minRupees}.`,
      400
    );
  }

  const amountPaise = rupeesToPaise(parsed.data.amountRupees);
  const db = getDb();

  return db.transaction(async (tx) => {
    const locked = await tx
      .select({
        id: influencerProfiles.id,
        handle: influencerProfiles.handle,
        availableBalancePaise: influencerProfiles.availableBalancePaise,
        upiId: influencerProfiles.upiId,
        bankAccountNumber: influencerProfiles.bankAccountNumber,
        bankIfsc: influencerProfiles.bankIfsc,
        bankDetailsNote: influencerProfiles.bankDetailsNote,
      })
      .from(influencerProfiles)
      .where(eq(influencerProfiles.id, influencerId));

    const row = locked[0];
    if (!row) {
      throw new AppError('NOT_FOUND', 'Influencer wallet not found.', 404);
    }

    const payoutDestination = row.upiId
      ? `UPI: ${row.upiId}`
      : row.bankAccountNumber && row.bankIfsc
        ? `IMPS A/C: ${row.bankAccountNumber} (${row.bankIfsc})`
        : row.bankDetailsNote
          ? `Bank: ${row.bankDetailsNote}`
          : null;

    if (!payoutDestination) {
      throw new AppError(
        'MISSING_PAYOUT_METHOD',
        'Please save your UPI ID or Bank Account + IFSC in your Influencer Profile before requesting a payout.',
        400
      );
    }

    if (row.availableBalancePaise < amountPaise) {
      throw new AppError(
        'INSUFFICIENT_BALANCE',
        'Requested payout exceeds your available commission balance.',
        409
      );
    }

    await tx
      .update(influencerProfiles)
      .set({
        availableBalancePaise: sql`${influencerProfiles.availableBalancePaise} - ${amountPaise}`,
        pendingPayoutPaise: sql`${influencerProfiles.pendingPayoutPaise} + ${amountPaise}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(influencerProfiles.id, influencerId));

    const [created] = await tx
      .insert(payoutRequests)
      .values({
        influencerId,
        amountPaise,
        payoutMethodSnapshot: payoutDestination,
        status: 'PENDING',
        note: parsed.data.note || null,
      })
      .returning();

    await recordAuditLog(
      {
        actorUserId,
        action: 'PAYOUT_REQUESTED',
        targetType: 'PAYOUT_REQUEST',
        targetId: created!.id,
        metadata: { amountPaise },
      },
      tx,
    );

    await notifyAllAdmins(
      {
        type: 'PAYOUT_REQUESTED',
        title: `Payout request ${formatInr(amountPaise)} from @${row.handle}`,
        body: `Destination: ${payoutDestination}`,
        href: '/admin',
      },
      tx,
    );

    return created!;
  });
}

export async function getInfluencerPayoutReceipt(params: {
  payoutId: string;
  viewerRole: 'INFLUENCER' | 'BUSINESS' | 'ADMIN' | 'CUSTOMER';
  viewerInfluencerId?: string | null;
}) {
  const db = getDb();
  const rows = await db
    .select({
      id: payoutRequests.id,
      amountPaise: payoutRequests.amountPaise,
      payoutMethodSnapshot: payoutRequests.payoutMethodSnapshot,
      status: payoutRequests.status,
      paymentReference: payoutRequests.paymentReference,
      note: payoutRequests.note,
      requestedAt: payoutRequests.requestedAt,
      processedAt: payoutRequests.processedAt,
      influencerId: influencerProfiles.id,
      influencerHandle: influencerProfiles.handle,
      influencerName: influencerProfiles.displayName,
      panNumber: influencerProfiles.panNumber,
      influencerEmail: users.email,
    })
    .from(payoutRequests)
    .innerJoin(
      influencerProfiles,
      eq(payoutRequests.influencerId, influencerProfiles.id)
    )
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(eq(payoutRequests.id, params.payoutId))
    .limit(1);

  const receipt = rows[0];
  if (!receipt) {
    throw new AppError('NOT_FOUND', 'Payout receipt not found.', 404);
  }

  if (
    params.viewerRole !== 'ADMIN' &&
    receipt.influencerId !== params.viewerInfluencerId
  ) {
    throw new AppError('FORBIDDEN', 'You cannot view another creator’s receipt.', 403);
  }

  return {
    ...receipt,
    requestedAt: receipt.requestedAt,
    processedAt: receipt.processedAt ?? null,
  };
}

export async function processPayoutRequestByAdmin(params: {
  payoutId: string;
  adminUserId: string;
  rawInput: unknown;
}) {
  const parsed = payoutProcessSchema.safeParse(params.rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid payout decision',
      400
    );
  }

  const input = parsed.data;
  const db = getDb();

  return db.transaction(async (tx) => {
    const locked = await tx
      .select({
        id: payoutRequests.id,
        influencerId: payoutRequests.influencerId,
        amountPaise: payoutRequests.amountPaise,
        status: payoutRequests.status,
      })
      .from(payoutRequests)
      .where(eq(payoutRequests.id, params.payoutId));

    const req = locked[0];
    if (!req) {
      throw new AppError('NOT_FOUND', 'Payout request not found.', 404);
    }
    if (req.status !== 'PENDING') {
      throw new AppError(
        'ALREADY_PROCESSED',
        'This payout request has already been processed.',
        409
      );
    }

    const infLock = await tx
      .select({ id: influencerProfiles.id, userId: influencerProfiles.userId })
      .from(influencerProfiles)
      .where(eq(influencerProfiles.id, req.influencerId));
    const infUserId = infLock[0]?.userId;

    const now = new Date().toISOString();

    if (input.action === 'PAY') {
      await tx
        .update(influencerProfiles)
        .set({
          pendingPayoutPaise: sql`${influencerProfiles.pendingPayoutPaise} - ${req.amountPaise}`,
          totalPaidPaise: sql`${influencerProfiles.totalPaidPaise} + ${req.amountPaise}`,
          updatedAt: now,
        })
        .where(eq(influencerProfiles.id, req.influencerId));

      const utr = input.paymentReference || `UTR${Date.now().toString().slice(-8)}`;
      const [updated] = await tx
        .update(payoutRequests)
        .set({
          status: 'PAID',
          paymentReference: utr,
          note: input.note || null,
          processedByUserId: params.adminUserId,
          processedAt: now,
        })
        .where(eq(payoutRequests.id, params.payoutId))
        .returning();

      await recordAuditLog(
        {
          actorUserId: params.adminUserId,
          action: 'PAYOUT_MARKED_PAID',
          targetType: 'PAYOUT_REQUEST',
          targetId: params.payoutId,
          metadata: {
            amountPaise: req.amountPaise,
            paymentReference: updated!.paymentReference,
          },
        },
        tx,
      );

      if (infUserId) {
        await createUserNotification(
          {
            userId: infUserId,
            type: 'PAYOUT_PAID',
            title: `Payout settled: ${formatInr(req.amountPaise)} (UTR: ${utr})`,
            body: `Your withdrawal has been transferred. View or print your UTR receipt anytime.`,
            href: `/influencer/earnings/receipts/${params.payoutId}`,
            sendEmail: true,
          },
          tx,
        );
      }

      return updated!;
    }

    // REJECT -> return funds back to available balance
    await tx
      .update(influencerProfiles)
      .set({
        pendingPayoutPaise: sql`${influencerProfiles.pendingPayoutPaise} - ${req.amountPaise}`,
        availableBalancePaise: sql`${influencerProfiles.availableBalancePaise} + ${req.amountPaise}`,
        updatedAt: now,
      })
      .where(eq(influencerProfiles.id, req.influencerId));

    const rejectReason = input.note || 'Payout details could not be verified.';
    const [updated] = await tx
      .update(payoutRequests)
      .set({
        status: 'REJECTED',
        note: rejectReason,
        processedByUserId: params.adminUserId,
        processedAt: now,
      })
      .where(eq(payoutRequests.id, params.payoutId))
      .returning();

    await recordAuditLog(
      {
        actorUserId: params.adminUserId,
        action: 'PAYOUT_REJECTED_REFUNDED',
        targetType: 'PAYOUT_REQUEST',
        targetId: params.payoutId,
        reason: input.note || null,
      },
      tx,
    );

    if (infUserId) {
      await createUserNotification(
        {
          userId: infUserId,
          type: 'PAYOUT_REJECTED',
          title: `Payout returned to wallet: ${formatInr(req.amountPaise)}`,
          body: `Reason: ${rejectReason}`,
          href: '/influencer/earnings',
          sendEmail: true,
        },
        tx,
      );
    }

    return updated!;
  });
}

export async function getBusinessDashboardMetrics(businessId: string) {
  const db = getDb();

  const [bizRows, productCounts, enrollmentCounts, salesStats] = await Promise.all([
    db
      .select({
        walletBalancePaise: businessProfiles.walletBalancePaise,
      })
      .from(businessProfiles)
      .where(eq(businessProfiles.id, businessId)),
    db
      .select({
        activeProducts: sql<number>`count(CASE WHEN ${products.status} = 'ACTIVE' THEN 1 END)`,
        totalProducts: sql<number>`count(*)`,
      })
      .from(products)
      .where(eq(products.businessId, businessId)),
    db
      .select({
        pendingCount: sql<number>`count(CASE WHEN ${enrollments.status} = 'PENDING' THEN 1 END)`,
        approvedCount: sql<number>`count(CASE WHEN ${enrollments.status} = 'APPROVED' THEN 1 END)`,
        totalClicks: sql<number>`COALESCE(sum(${enrollments.clicksCount}), 0)`,
      })
      .from(enrollments)
      .innerJoin(products, eq(enrollments.productId, products.id))
      .where(eq(products.businessId, businessId)),
    db
      .select({
        salesCount: sql<number>`count(CASE WHEN ${promoSales.status} != 'REFUNDED' THEN 1 END)`,
        unitsSold: sql<number>`COALESCE(sum(CASE WHEN ${promoSales.status} != 'REFUNDED' THEN ${promoSales.quantity} END), 0)`,
        grossRevenuePaise: sql<number>`COALESCE(sum(CASE WHEN ${promoSales.status} != 'REFUNDED' THEN ${promoSales.grossAmountPaise} END), 0)`,
        commissionOwedPaise: sql<number>`COALESCE(sum(CASE WHEN ${promoSales.status} != 'REFUNDED' THEN ${promoSales.commissionAmountPaise} END), 0)`,
      })
      .from(promoSales)
      .where(eq(promoSales.businessId, businessId)),
  ]);

  return {
    walletBalancePaise: bizRows[0]?.walletBalancePaise ?? 0,
    activeProducts: productCounts[0]?.activeProducts ?? 0,
    totalProducts: productCounts[0]?.totalProducts ?? 0,
    pendingEnrollments: enrollmentCounts[0]?.pendingCount ?? 0,
    activePromoCodes: enrollmentCounts[0]?.approvedCount ?? 0,
    totalPromoClicks: enrollmentCounts[0]?.totalClicks ?? 0,
    totalSalesLogged: salesStats[0]?.salesCount ?? 0,
    totalUnitsSold: salesStats[0]?.unitsSold ?? 0,
    totalGrossSalesPaise: salesStats[0]?.grossRevenuePaise ?? 0,
    totalInfluencerCommissionPaise: salesStats[0]?.commissionOwedPaise ?? 0,
  };
}

export async function getAdminPlatformOverview() {
  const db = getDb();

  const [userStats, campaignStats, salesStats, payoutRows, allUsers, recentAudits] =
    await Promise.all([
      db
        .select({
          businesses: sql<number>`count(CASE WHEN ${users.role} = 'BUSINESS' THEN 1 END)`,
          influencers: sql<number>`count(CASE WHEN ${users.role} = 'INFLUENCER' THEN 1 END)`,
        })
        .from(users),
      db
        .select({
          activeProducts: sql<number>`count(CASE WHEN ${products.status} = 'ACTIVE' THEN 1 END)`,
          activeCodes: sql<number>`(SELECT count(*) FROM enrollments WHERE status = 'APPROVED')`,
        })
        .from(products),
      db
        .select({
          totalSales: sql<number>`count(*)`,
          grossVolumePaise: sql<number>`COALESCE(sum(${promoSales.grossAmountPaise}), 0)`,
          commissionsPaise: sql<number>`COALESCE(sum(${promoSales.commissionAmountPaise}), 0)`,
          platformFeesPaise: sql<number>`COALESCE(sum(${promoSales.platformFeePaise}), 0)`,
        })
        .from(promoSales)
        .where(ne(promoSales.status, 'REFUNDED')),
      db
        .select({
          id: payoutRequests.id,
          amountPaise: payoutRequests.amountPaise,
          payoutMethodSnapshot: payoutRequests.payoutMethodSnapshot,
          status: payoutRequests.status,
          paymentReference: payoutRequests.paymentReference,
          note: payoutRequests.note,
          requestedAt: payoutRequests.requestedAt,
          processedAt: payoutRequests.processedAt,
          influencerHandle: influencerProfiles.handle,
          influencerName: influencerProfiles.displayName,
        })
        .from(payoutRequests)
        .innerJoin(
          influencerProfiles,
          eq(payoutRequests.influencerId, influencerProfiles.id)
        )
        .orderBy(desc(payoutRequests.requestedAt))
        .limit(100),
      db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          status: users.status,
          emailVerifiedAt: users.emailVerifiedAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(100),
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          targetType: auditLogs.targetType,
          targetId: auditLogs.targetId,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
          actorEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(80),
    ]);

  return {
    counts: {
      businesses: userStats[0]?.businesses ?? 0,
      influencers: userStats[0]?.influencers ?? 0,
      activeProducts: campaignStats[0]?.activeProducts ?? 0,
      activePromoCodes: campaignStats[0]?.activeCodes ?? 0,
      totalSales: salesStats[0]?.totalSales ?? 0,
      grossVolumePaise: salesStats[0]?.grossVolumePaise ?? 0,
      totalCommissionsPaise: salesStats[0]?.commissionsPaise ?? 0,
      totalPlatformFeesPaise: salesStats[0]?.platformFeesPaise ?? 0,
    },
    payouts: payoutRows.map((p) => ({
      ...p,
      requestedAt: p.requestedAt,
      processedAt: p.processedAt ?? null,
    })),
    users: allUsers.map((u) => ({
      ...u,
      emailVerified: Boolean(u.emailVerifiedAt),
      createdAt: u.createdAt,
    })),
    audits: recentAudits.map((a) => ({ ...a, createdAt: a.createdAt })),
  };
}

export async function updateAdminUserStatus(params: {
  targetUserId: string;
  adminUserId: string;
  rawInput: unknown;
}) {
  const parsed = adminUserStatusSchema.safeParse(params.rawInput);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Provide status and reason.', 400);
  }
  if (params.targetUserId === params.adminUserId) {
    throw new AppError('FORBIDDEN', 'You cannot suspend your own admin account.', 403);
  }

  const db = getDb();
  const [updated] = await db
    .update(users)
    .set({ status: parsed.data.status, updatedAt: new Date().toISOString() })
    .where(eq(users.id, params.targetUserId))
    .returning();

  if (!updated) {
    throw new AppError('NOT_FOUND', 'User not found.', 404);
  }

  if (parsed.data.status === 'SUSPENDED') {
    await db
      .update(sessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(eq(sessions.userId, params.targetUserId));
  }

  await recordAuditLog({
    actorUserId: params.adminUserId,
    action: `USER_${parsed.data.status}`,
    targetType: 'USER',
    targetId: params.targetUserId,
    reason: parsed.data.reason,
  });

  return updated;
}
