import { and, desc, eq, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getDb, type DbExecutor } from '@/server/db';
import {
  businessProfiles,
  enrollments,
  influencerProfiles,
  products,
  promoClicks,
} from '@/server/db/schema';
import { sha256Hex } from '@/server/lib/crypto';
import { recordAuditLog } from '@/server/audit/audit.service';
import { createUserNotification } from '@/server/services/notification.service';
import {
  enrollmentApplySchema,
  enrollmentDecisionSchema,
} from '@/server/validation/schemas';

export function suggestSimplePromoCode(params: {
  influencerHandle: string;
  promoCodePrefix: string | null;
  buyerDiscountPercent: number;
  commissionPercent: number | null;
}): string {
  const cleanHandle =
    params.influencerHandle
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'CREATOR';

  const cleanPrefix = (params.promoCodePrefix || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

  const tagNumber =
    params.buyerDiscountPercent > 0
      ? String(params.buyerDiscountPercent)
      : params.commissionPercent
        ? String(params.commissionPercent)
        : '10';

  if (cleanPrefix) {
    return `${cleanPrefix}-${cleanHandle}`.slice(0, 20);
  }
  return `${cleanHandle}${tagNumber}`.slice(0, 20);
}

async function resolveUniquePromoCode(
  tx: DbExecutor,
  desiredBase: string
): Promise<string> {
  const normalized = desiredBase
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20);

  const base = normalized.length >= 4 ? normalized : `PROMO-${normalized || 'CODE'}`;

  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate =
      attempt === 0 ? base : `${base}-${Math.floor(10 + Math.random() * 89)}`;
    const existing = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(eq(enrollments.promoCode, candidate))
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString().slice(-4)}`;
}

export async function applyForProductEnrollment(
  influencerId: string,
  actorUserId: string,
  rawInput: unknown
) {
  const parsed = enrollmentApplySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid enrollment request',
      400
    );
  }

  const db = getDb();
  const [productRow] = await db
    .select({
      product: products,
      businessUserId: businessProfiles.userId,
    })
    .from(products)
    .innerJoin(businessProfiles, eq(products.businessId, businessProfiles.id))
    .where(eq(products.id, parsed.data.productId))
    .limit(1);

  if (!productRow || productRow.product.status !== 'ACTIVE') {
    throw new AppError(
      'PRODUCT_UNAVAILABLE',
      'This product is not currently open for new influencer enrollments.',
      409
    );
  }

  const [influencer] = await db
    .select({ handle: influencerProfiles.handle, displayName: influencerProfiles.displayName })
    .from(influencerProfiles)
    .where(eq(influencerProfiles.id, influencerId))
    .limit(1);

  const [existing] = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.productId, productRow.product.id),
        eq(enrollments.influencerId, influencerId)
      )
    )
    .limit(1);

  if (existing) {
    if (existing.status === 'REJECTED') {
      const [reapplied] = await db
        .update(enrollments)
        .set({
          status: 'PENDING',
          pitchNote: parsed.data.pitchNote,
          rejectionReason: null,
          appliedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(enrollments.id, existing.id))
        .returning();

      await createUserNotification({
        userId: productRow.businessUserId,
        type: 'ENROLLMENT_APPLIED',
        title: `@${influencer?.handle || 'creator'} re-applied to promote ${productRow.product.title}`,
        body: parsed.data.pitchNote,
        href: '/business/enrollments',
        sendEmail: true,
      });

      return reapplied!;
    }
    throw new AppError(
      'ALREADY_ENROLLED',
      'You have already applied or enrolled for this product.',
      409
    );
  }

  const [created] = await db
    .insert(enrollments)
    .values({
      productId: productRow.product.id,
      influencerId,
      pitchNote: parsed.data.pitchNote,
      status: 'PENDING',
    })
    .returning();

  await recordAuditLog({
    actorUserId,
    action: 'INFLUENCER_ENROLLMENT_APPLIED',
    targetType: 'ENROLLMENT',
    targetId: created!.id,
    metadata: { productId: productRow.product.id },
  });

  await createUserNotification({
    userId: productRow.businessUserId,
    type: 'ENROLLMENT_APPLIED',
    title: `New creator request: @${influencer?.handle || 'creator'}`,
    body: `${influencer?.displayName || 'An influencer'} requested a promo code for "${productRow.product.title}".`,
    href: '/business/enrollments',
    sendEmail: true,
  });

  return created!;
}

export async function decideEnrollmentByBusiness(params: {
  enrollmentId: string;
  businessId: string;
  actorUserId: string;
  rawInput: unknown;
}) {
  const parsed = enrollmentDecisionSchema.safeParse(params.rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid decision input',
      400
    );
  }

  const input = parsed.data;
  const db = getDb();

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        enrollment: enrollments,
        product: products,
        influencer: influencerProfiles,
      })
      .from(enrollments)
      .innerJoin(products, eq(enrollments.productId, products.id))
      .innerJoin(influencerProfiles, eq(enrollments.influencerId, influencerProfiles.id))
      .where(eq(enrollments.id, params.enrollmentId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new AppError('NOT_FOUND', 'Enrollment request not found.', 404);
    }

    if (row.product.businessId !== params.businessId) {
      throw new AppError(
        'FORBIDDEN',
        'You can only manage influencer enrollments on your own products.',
        403
      );
    }

    const now = new Date().toISOString();

    if (input.action === 'APPROVE') {
      let finalPromoCode = row.enrollment.promoCode;

      if (input.customPromoCode) {
        const collision = await tx
          .select({ id: enrollments.id })
          .from(enrollments)
          .where(eq(enrollments.promoCode, input.customPromoCode))
          .limit(1);

        if (collision.length > 0 && collision[0]!.id !== row.enrollment.id) {
          throw new AppError(
            'PROMO_CODE_TAKEN',
            `Promo code "${input.customPromoCode}" is already in use. Choose another code.`,
            409
          );
        }
        finalPromoCode = input.customPromoCode;
      } else if (!finalPromoCode) {
        const suggested = suggestSimplePromoCode({
          influencerHandle: row.influencer.handle,
          promoCodePrefix: row.product.promoCodePrefix,
          buyerDiscountPercent: row.product.buyerDiscountPercent,
          commissionPercent: row.product.commissionPercent,
        });
        finalPromoCode = await resolveUniquePromoCode(tx, suggested);
      }

      const [updated] = await tx
        .update(enrollments)
        .set({
          status: 'APPROVED',
          promoCode: finalPromoCode,
          rejectionReason: null,
          decidedAt: now,
          updatedAt: now,
        })
        .where(eq(enrollments.id, row.enrollment.id))
        .returning();

      await recordAuditLog(
        {
          actorUserId: params.actorUserId,
          action: 'ENROLLMENT_APPROVED',
          targetType: 'ENROLLMENT',
          targetId: row.enrollment.id,
          metadata: { promoCode: finalPromoCode },
        },
        tx
      );

      await createUserNotification(
        {
          userId: row.influencer.userId,
          type: 'ENROLLMENT_APPROVED',
          title: `Promo code ${finalPromoCode} approved!`,
          body: `Your enrollment for "${row.product.title}" is active. Share ${finalPromoCode} or your tracked link /r/${finalPromoCode}!`,
          href: '/influencer/campaigns',
          sendEmail: true,
        },
        tx
      );

      return updated!;
    }

    if (input.action === 'REJECT') {
      const reason = input.rejectionReason || 'Not selected for this campaign.';
      const [updated] = await tx
        .update(enrollments)
        .set({
          status: 'REJECTED',
          rejectionReason: reason,
          decidedAt: now,
          updatedAt: now,
        })
        .where(eq(enrollments.id, row.enrollment.id))
        .returning();

      await recordAuditLog(
        {
          actorUserId: params.actorUserId,
          action: 'ENROLLMENT_REJECTED',
          targetType: 'ENROLLMENT',
          targetId: row.enrollment.id,
          reason: input.rejectionReason || null,
        },
        tx
      );

      await createUserNotification(
        {
          userId: row.influencer.userId,
          type: 'ENROLLMENT_REJECTED',
          title: `Application update for ${row.product.title}`,
          body: `Reason: ${reason}`,
          href: '/influencer/campaigns',
          sendEmail: true,
        },
        tx
      );

      return updated!;
    }

    const [updated] = await tx
      .update(enrollments)
      .set({
        status: 'PAUSED',
        updatedAt: now,
      })
      .where(eq(enrollments.id, row.enrollment.id))
      .returning();

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        action: 'ENROLLMENT_PAUSED',
        targetType: 'ENROLLMENT',
        targetId: row.enrollment.id,
      },
      tx
    );

    await createUserNotification(
      {
        userId: row.influencer.userId,
        type: 'ENROLLMENT_PAUSED',
        title: `Promo code ${row.enrollment.promoCode || ''} paused`,
        body: `The brand temporarily paused "${row.product.title}".`,
        href: '/influencer/campaigns',
      },
      tx
    );

    return updated!;
  });
}

export async function recordPromoLinkClick(params: {
  code: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string | null;
}): Promise<{ redirectUrl: string; promoCode: string; productSlug: string }> {
  const cleanCode = params.code.trim().toUpperCase();
  const db = getDb();

  const rows = await db
    .select({
      enrollmentId: enrollments.id,
      enrollmentStatus: enrollments.status,
      promoCode: enrollments.promoCode,
      influencerId: enrollments.influencerId,
      productId: products.id,
      productSlug: products.slug,
      externalProductUrl: products.externalProductUrl,
    })
    .from(enrollments)
    .innerJoin(products, eq(enrollments.productId, products.id))
    .where(eq(enrollments.promoCode, cleanCode))
    .limit(1);

  const match = rows[0];
  if (!match) {
    throw new AppError('NOT_FOUND', `Promo link "${cleanCode}" not found.`, 404);
  }

  const ipHash = params.ipAddress ? sha256Hex(params.ipAddress).slice(0, 24) : null;

  await db.transaction(async (tx) => {
    await tx.insert(promoClicks).values({
      enrollmentId: match.enrollmentId,
      productId: match.productId,
      influencerId: match.influencerId,
      ipHash,
      userAgent: params.userAgent?.slice(0, 250) || null,
      referer: params.referer?.slice(0, 250) || null,
    });

    await tx
      .update(enrollments)
      .set({
        clicksCount: sql`${enrollments.clicksCount} + 1`,
      })
      .where(eq(enrollments.id, match.enrollmentId));
  });

  if (match.externalProductUrl && /^https?:\/\//i.test(match.externalProductUrl)) {
    try {
      const target = new URL(match.externalProductUrl);
      const isPlaceholderDomain =
        target.hostname.endsWith('.example.com') ||
        target.hostname === 'example.com' ||
        target.hostname.endsWith('.local');

      if (!isPlaceholderDomain) {
        target.searchParams.set('discount', cleanCode);
        target.searchParams.set('promo', cleanCode);
        target.searchParams.set('utm_source', 'promobridge');
        return {
          redirectUrl: target.toString(),
          promoCode: cleanCode,
          productSlug: match.productSlug,
        };
      }
    } catch {
      // fall through to internal campaign detail page
    }
  }

  return {
    redirectUrl: `/products/${match.productSlug}?promo=${encodeURIComponent(cleanCode)}`,
    promoCode: cleanCode,
    productSlug: match.productSlug,
  };
}

export async function listBusinessEnrollments(businessId: string, statusFilter?: string) {
  const db = getDb();
  const conditions = [eq(products.businessId, businessId)];
  if (
    statusFilter === 'PENDING' ||
    statusFilter === 'APPROVED' ||
    statusFilter === 'REJECTED' ||
    statusFilter === 'PAUSED'
  ) {
    conditions.push(eq(enrollments.status, statusFilter));
  }

  const rows = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      pitchNote: enrollments.pitchNote,
      promoCode: enrollments.promoCode,
      rejectionReason: enrollments.rejectionReason,
      clicksCount: enrollments.clicksCount,
      totalSalesCount: enrollments.totalSalesCount,
      totalUnitsSold: enrollments.totalUnitsSold,
      totalGrossSalesPaise: enrollments.totalGrossSalesPaise,
      totalCommissionPaise: enrollments.totalCommissionPaise,
      appliedAt: enrollments.appliedAt,
      productId: products.id,
      productTitle: products.title,
      productSlug: products.slug,
      promoCodePrefix: products.promoCodePrefix,
      buyerDiscountPercent: products.buyerDiscountPercent,
      commissionType: products.commissionType,
      commissionFixedPaise: products.commissionFixedPaise,
      commissionPercent: products.commissionPercent,
      influencerId: influencerProfiles.id,
      influencerHandle: influencerProfiles.handle,
      influencerName: influencerProfiles.displayName,
      influencerNiche: influencerProfiles.niche,
      followerCount: influencerProfiles.followerCount,
      instagramUrl: influencerProfiles.instagramUrl,
      youtubeUrl: influencerProfiles.youtubeUrl,
    })
    .from(enrollments)
    .innerJoin(products, eq(enrollments.productId, products.id))
    .innerJoin(influencerProfiles, eq(enrollments.influencerId, influencerProfiles.id))
    .where(and(...conditions))
    .orderBy(desc(enrollments.appliedAt));

  return rows.map((r) => ({
    ...r,
    appliedAt: r.appliedAt,
    conversionRatePercent:
      r.clicksCount > 0
        ? Number(((r.totalSalesCount / r.clicksCount) * 100).toFixed(1))
        : 0,
    suggestedCode:
      r.promoCode ||
      suggestSimplePromoCode({
        influencerHandle: r.influencerHandle,
        promoCodePrefix: r.promoCodePrefix,
        buyerDiscountPercent: r.buyerDiscountPercent,
        commissionPercent: r.commissionPercent,
      }),
  }));
}

export async function listInfluencerCampaigns(influencerId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: enrollments.id,
      status: enrollments.status,
      pitchNote: enrollments.pitchNote,
      promoCode: enrollments.promoCode,
      rejectionReason: enrollments.rejectionReason,
      clicksCount: enrollments.clicksCount,
      totalSalesCount: enrollments.totalSalesCount,
      totalUnitsSold: enrollments.totalUnitsSold,
      totalGrossSalesPaise: enrollments.totalGrossSalesPaise,
      totalCommissionPaise: enrollments.totalCommissionPaise,
      appliedAt: enrollments.appliedAt,
      productId: products.id,
      productTitle: products.title,
      productSlug: products.slug,
      externalProductUrl: products.externalProductUrl,
      retailPricePaise: products.retailPricePaise,
      commissionType: products.commissionType,
      commissionFixedPaise: products.commissionFixedPaise,
      commissionPercent: products.commissionPercent,
      buyerDiscountPercent: products.buyerDiscountPercent,
      brandName: businessProfiles.brandName,
      businessSlug: businessProfiles.slug,
    })
    .from(enrollments)
    .innerJoin(products, eq(enrollments.productId, products.id))
    .innerJoin(businessProfiles, eq(products.businessId, businessProfiles.id))
    .where(eq(enrollments.influencerId, influencerId))
    .orderBy(desc(enrollments.appliedAt));

  return rows.map((r) => ({
    ...r,
    appliedAt: r.appliedAt,
    conversionRatePercent:
      r.clicksCount > 0
        ? Number(((r.totalSalesCount / r.clicksCount) * 100).toFixed(1))
        : 0,
  }));
}
