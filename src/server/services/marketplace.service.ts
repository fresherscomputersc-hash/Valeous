import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { rupeesToPaise } from '@/lib/format';
import { getDb } from '@/server/db';
import {
  businessProfiles,
  categories,
  enrollments,
  influencerProfiles,
  products,
  users,
} from '@/server/db/schema';
import { generateOpaqueToken } from '@/server/lib/crypto';
import { recordAuditLog } from '@/server/audit/audit.service';
import {
  businessProfileUpdateSchema,
  influencerProfileUpdateSchema,
  productInputSchema,
} from '@/server/validation/schemas';

function makeProductSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 44);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || 'product'}-${suffix}`;
}

export async function listAllCategories() {
  const db = getDb();
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .orderBy(categories.name);
}

export function computeEstimatedCommissionPerUnitPaise(p: {
  retailPricePaise: number;
  commissionType: 'FIXED_PER_SALE' | 'PERCENTAGE';
  commissionFixedPaise: number | null;
  commissionPercent: number | null;
  buyerDiscountPercent: number;
}): number {
  if (p.commissionType === 'FIXED_PER_SALE') {
    return p.commissionFixedPaise ?? 0;
  }
  const discountedUnitPaise = Math.round(
    (p.retailPricePaise * (100 - p.buyerDiscountPercent)) / 100
  );
  return Math.round((discountedUnitPaise * (p.commissionPercent ?? 0)) / 100);
}

export async function listMarketplaceProducts(filters: {
  q?: string;
  categorySlug?: string;
  commissionType?: string;
  sort?: string;
}) {
  const db = getDb();
  const conditions = [eq(products.status, 'ACTIVE'), eq(users.status, 'ACTIVE')];

  if (filters.categorySlug) {
    conditions.push(eq(categories.slug, filters.categorySlug));
  }
  if (
    filters.commissionType === 'FIXED_PER_SALE' ||
    filters.commissionType === 'PERCENTAGE'
  ) {
    conditions.push(eq(products.commissionType, filters.commissionType));
  }
  if (filters.q && filters.q.trim().length > 0) {
    const pattern = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(products.title, pattern),
        ilike(products.description, pattern),
        ilike(businessProfiles.brandName, pattern)
      )!
    );
  }

  const rows = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      description: products.description,
      imageUrl: products.imageUrl,
      imageAlt: products.imageAlt,
      externalProductUrl: products.externalProductUrl,
      retailPricePaise: products.retailPricePaise,
      commissionType: products.commissionType,
      commissionFixedPaise: products.commissionFixedPaise,
      commissionPercent: products.commissionPercent,
      buyerDiscountPercent: products.buyerDiscountPercent,
      promoCodePrefix: products.promoCodePrefix,
      status: products.status,
      createdAt: products.createdAt,
      categoryName: categories.name,
      categorySlug: categories.slug,
      businessId: businessProfiles.id,
      brandName: businessProfiles.brandName,
      businessSlug: businessProfiles.slug,
      businessCity: businessProfiles.city,
      activeInfluencersCount: sql<number>`(
        SELECT count(*) FROM enrollments e
        WHERE e.product_id = ${products.id} AND e.status = 'APPROVED'
      )`,
    })
    .from(products)
    .innerJoin(businessProfiles, eq(products.businessId, businessProfiles.id))
    .innerJoin(users, eq(businessProfiles.userId, users.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));

  const mapped = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt,
    estimatedUnitCommissionPaise: computeEstimatedCommissionPerUnitPaise(r as { commissionType: 'PERCENTAGE' | 'FIXED_PER_SALE'; commissionFixedPaise: number | null; commissionPercent: number | null; buyerDiscountPercent: number; retailPricePaise: number }),
  }));

  if (filters.sort === 'highest_payout') {
    mapped.sort(
      (a, b) => b.estimatedUnitCommissionPaise - a.estimatedUnitCommissionPaise
    );
  } else if (filters.sort === 'popular') {
    mapped.sort((a, b) => b.activeInfluencersCount - a.activeInfluencersCount);
  }

  return mapped;
}

export async function listMarketplaceProductsPaginated(filters: {
  q?: string;
  categorySlug?: string;
  commissionType?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}) {
  const all = await listMarketplaceProducts(filters);
  const pageSize = Math.min(24, Math.max(1, filters.pageSize ?? 9));
  const totalCount = all.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(totalPages, Math.max(1, filters.page ?? 1));
  const start = (page - 1) * pageSize;

  return {
    items: all.slice(start, start + pageSize),
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function getProductDetailBySlug(
  slug: string,
  viewerInfluencerId?: string | null
) {
  const db = getDb();
  const rows = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      description: products.description,
      imageUrl: products.imageUrl,
      imageAlt: products.imageAlt,
      externalProductUrl: products.externalProductUrl,
      retailPricePaise: products.retailPricePaise,
      commissionType: products.commissionType,
      commissionFixedPaise: products.commissionFixedPaise,
      commissionPercent: products.commissionPercent,
      buyerDiscountPercent: products.buyerDiscountPercent,
      promoCodePrefix: products.promoCodePrefix,
      status: products.status,
      createdAt: products.createdAt,
      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,
      businessId: businessProfiles.id,
      brandName: businessProfiles.brandName,
      businessSlug: businessProfiles.slug,
      businessDescription: businessProfiles.description,
      businessWebsite: businessProfiles.websiteUrl,
      businessCity: businessProfiles.city,
      activeInfluencersCount: sql<number>`(
        SELECT count(*) FROM enrollments e
        WHERE e.product_id = ${products.id} AND e.status = 'APPROVED'
      )`,
    })
    .from(products)
    .innerJoin(businessProfiles, eq(products.businessId, businessProfiles.id))
    .innerJoin(users, eq(businessProfiles.userId, users.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(users.status, 'ACTIVE')))
    .limit(1);

  const product = rows[0];
  if (!product) {
    throw new AppError('NOT_FOUND', 'Product campaign not found.', 404);
  }

  let viewerEnrollment: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED';
    promoCode: string | null;
    rejectionReason: string | null;
    clicksCount: number;
    totalSalesCount: number;
    totalCommissionPaise: number;
  } | null = null;

  if (viewerInfluencerId) {
    const [enrollment] = await db
      .select({
        id: enrollments.id,
        status: enrollments.status,
        promoCode: enrollments.promoCode,
        rejectionReason: enrollments.rejectionReason,
        clicksCount: enrollments.clicksCount,
        totalSalesCount: enrollments.totalSalesCount,
        totalCommissionPaise: enrollments.totalCommissionPaise,
      })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.productId, product.id),
          eq(enrollments.influencerId, viewerInfluencerId)
        )
      )
      .limit(1);

    viewerEnrollment = enrollment as { id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED'; promoCode: string | null; rejectionReason: string | null; clicksCount: number; totalSalesCount: number; totalCommissionPaise: number } | null;
  }

  return {
    ...product,
    createdAt: product.createdAt,
    estimatedUnitCommissionPaise: computeEstimatedCommissionPerUnitPaise(product as { commissionType: 'PERCENTAGE' | 'FIXED_PER_SALE'; commissionFixedPaise: number | null; commissionPercent: number | null; buyerDiscountPercent: number; retailPricePaise: number }),
    viewerEnrollment: viewerEnrollment as { id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED'; promoCode: string | null; rejectionReason: string | null; clicksCount: number; totalSalesCount: number; totalCommissionPaise: number } | null,
  };
}

export async function createBusinessProduct(
  businessId: string,
  actorUserId: string,
  rawInput: unknown
) {
  const parsed = productInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid product details',
      400
    );
  }

  const d = parsed.data;
  const db = getDb();
  const slug = makeProductSlug(d.title);

  const [created] = await db
    .insert(products)
    .values({
      businessId,
      categoryId: d.categoryId,
      title: d.title,
      slug,
      description: d.description,
      imageUrl: d.imageUrl || null,
      imageAlt: d.imageAlt || d.title,
      externalProductUrl: d.externalProductUrl || null,
      retailPricePaise: rupeesToPaise(d.retailPriceRupees),
      commissionType: d.commissionType,
      commissionFixedPaise:
        d.commissionType === 'FIXED_PER_SALE' && d.commissionFixedRupees
          ? rupeesToPaise(d.commissionFixedRupees)
          : null,
      commissionPercent:
        d.commissionType === 'PERCENTAGE' ? (d.commissionPercent ?? null) : null,
      buyerDiscountPercent: d.buyerDiscountPercent,
      promoCodePrefix: d.promoCodePrefix || null,
      status: d.status ?? 'ACTIVE',
    })
    .returning();

  if (!created) {
    throw new AppError('INTERNAL_ERROR', 'Failed to create product listing', 500);
  }

  await recordAuditLog({
    actorUserId,
    action: 'PRODUCT_CREATED',
    targetType: 'PRODUCT',
    targetId: created.id,
    metadata: {
      commissionType: created.commissionType,
      retailPricePaise: created.retailPricePaise,
    },
  });

  return created;
}

export async function updateBusinessProduct(
  productId: string,
  businessId: string,
  actorUserId: string,
  rawInput: unknown
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Product not found.', 404);
  }
  if (existing.businessId !== businessId) {
    throw new AppError('FORBIDDEN', 'You can only manage your own business products.', 403);
  }

  if (
    typeof rawInput === 'object' &&
    rawInput !== null &&
    'statusOnly' in rawInput &&
    (rawInput as { statusOnly?: string }).statusOnly
  ) {
    const nextStatus = (rawInput as { statusOnly: 'ACTIVE' | 'PAUSED' | 'ENDED' }).statusOnly;
    if (!['ACTIVE', 'PAUSED', 'ENDED'].includes(nextStatus)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid product status.', 400);
    }

    const [updated] = await db
      .update(products)
      .set({ status: nextStatus, updatedAt: new Date().toISOString() })
      .where(eq(products.id, productId))
      .returning();

    await recordAuditLog({
      actorUserId,
      action: 'PRODUCT_STATUS_CHANGED',
      targetType: 'PRODUCT',
      targetId: productId,
      metadata: { status: nextStatus },
    });
    return updated!;
  }

  const parsed = productInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid product update',
      400
    );
  }

  const d = parsed.data;
  const [updated] = await db
    .update(products)
    .set({
      categoryId: d.categoryId,
      title: d.title,
      description: d.description,
      imageUrl: d.imageUrl || null,
      imageAlt: d.imageAlt || d.title,
      externalProductUrl: d.externalProductUrl || null,
      retailPricePaise: rupeesToPaise(d.retailPriceRupees),
      commissionType: d.commissionType,
      commissionFixedPaise:
        d.commissionType === 'FIXED_PER_SALE' && d.commissionFixedRupees
          ? rupeesToPaise(d.commissionFixedRupees)
          : null,
      commissionPercent:
        d.commissionType === 'PERCENTAGE' ? (d.commissionPercent ?? null) : null,
      buyerDiscountPercent: d.buyerDiscountPercent,
      promoCodePrefix: d.promoCodePrefix || null,
      status: d.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, productId))
    .returning();

  await recordAuditLog({
    actorUserId,
    action: 'PRODUCT_UPDATED',
    targetType: 'PRODUCT',
    targetId: productId,
  });

  return updated!;
}

export async function listBusinessOwnProducts(businessId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      categoryId: products.categoryId,
      categoryName: categories.name,
      retailPricePaise: products.retailPricePaise,
      commissionType: products.commissionType,
      commissionFixedPaise: products.commissionFixedPaise,
      commissionPercent: products.commissionPercent,
      buyerDiscountPercent: products.buyerDiscountPercent,
      promoCodePrefix: products.promoCodePrefix,
      status: products.status,
      createdAt: products.createdAt,
      pendingEnrollments: sql<number>`(
        SELECT count(*) FROM enrollments e
        WHERE e.product_id = ${products.id} AND e.status = 'PENDING'
      )`,
      approvedEnrollments: sql<number>`(
        SELECT count(*) FROM enrollments e
        WHERE e.product_id = ${products.id} AND e.status = 'APPROVED'
      )`,
      totalClicksCount: sql<number>`(
        SELECT COALESCE(sum(e.clicks_count), 0) FROM enrollments e
        WHERE e.product_id = ${products.id}
      )`,
      totalSalesCount: sql<number>`(
        SELECT COALESCE(sum(e.total_sales_count), 0) FROM enrollments e
        WHERE e.product_id = ${products.id}
      )`,
      totalCommissionPaise: sql<number>`(
        SELECT COALESCE(sum(e.total_commission_paise), 0) FROM enrollments e
        WHERE e.product_id = ${products.id}
      )`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.businessId, businessId))
    .orderBy(desc(products.createdAt));

  return rows.map((r) => ({ ...r, createdAt: r.createdAt }));
}

export async function getBusinessOwnProductById(productId: string, businessId: string) {
  const db = getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    throw new AppError('NOT_FOUND', 'Product not found.', 404);
  }
  if (product.businessId !== businessId) {
    throw new AppError('FORBIDDEN', 'You cannot edit another business’s product.', 403);
  }
  return product;
}

export async function getBusinessProfileDetails(businessId: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.id, businessId))
    .limit(1);

  if (!profile) {
    throw new AppError('NOT_FOUND', 'Business profile not found.', 404);
  }
  return profile;
}

export async function updateBusinessProfileDetails(
  businessId: string,
  actorUserId: string,
  rawInput: unknown
) {
  const parsed = businessProfileUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid business profile details',
      400
    );
  }

  const d = parsed.data;
  const db = getDb();

  const [updated] = await db
    .update(businessProfiles)
    .set({
      brandName: d.brandName,
      description: d.description,
      categoryId: d.categoryId ?? null,
      websiteUrl: d.websiteUrl || null,
      city: d.city,
      gstin: d.gstin || null,
      logoUrl: d.logoUrl || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(businessProfiles.id, businessId))
    .returning();

  await db
    .update(users)
    .set({ displayName: d.brandName, updatedAt: new Date().toISOString() })
    .where(eq(users.id, actorUserId));

  return updated!;
}

export async function rotateBusinessWebhookSecret(
  businessId: string,
  actorUserId: string
) {
  const db = getDb();
  const nextSecret = `whsec_${generateOpaqueToken(24)}`;
  const [updated] = await db
    .update(businessProfiles)
    .set({ webhookSecret: nextSecret, updatedAt: new Date().toISOString() })
    .where(eq(businessProfiles.id, businessId))
    .returning({
      webhookKey: businessProfiles.webhookKey,
      webhookSecret: businessProfiles.webhookSecret,
    });

  if (!updated) {
    throw new AppError('NOT_FOUND', 'Business profile not found.', 404);
  }

  await recordAuditLog({
    actorUserId,
    action: 'WEBHOOK_SECRET_ROTATED',
    targetType: 'BUSINESS',
    targetId: businessId,
  });

  return updated;
}

export async function getInfluencerProfileDetails(influencerId: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(influencerProfiles)
    .where(eq(influencerProfiles.id, influencerId))
    .limit(1);

  if (!profile) {
    throw new AppError('NOT_FOUND', 'Influencer profile not found.', 404);
  }
  return profile;
}

export async function updateInfluencerProfileDetails(
  influencerId: string,
  actorUserId: string,
  rawInput: unknown
) {
  const parsed = influencerProfileUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid influencer profile details',
      400
    );
  }

  const d = parsed.data;
  const db = getDb();

  const [updated] = await db
    .update(influencerProfiles)
    .set({
      displayName: d.displayName,
      bio: d.bio,
      niche: d.niche,
      instagramUrl: d.instagramUrl || null,
      youtubeUrl: d.youtubeUrl || null,
      followerCount: d.followerCount,
      upiId: d.upiId || null,
      bankAccountNumber: d.bankAccountNumber || null,
      bankIfsc: d.bankIfsc || null,
      panNumber: d.panNumber || null,
      bankDetailsNote: d.bankDetailsNote || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(influencerProfiles.id, influencerId))
    .returning();

  await db
    .update(users)
    .set({ displayName: d.displayName, updatedAt: new Date().toISOString() })
    .where(eq(users.id, actorUserId));

  return updated!;
}

export async function getPublicBrandPage(slug: string) {
  const db = getDb();
  const [brand] = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.slug, slug))
    .limit(1);

  if (!brand) {
    throw new AppError('NOT_FOUND', 'Brand not found.', 404);
  }

  const brandProducts = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      description: products.description,
      imageUrl: products.imageUrl,
      imageAlt: products.imageAlt,
      retailPricePaise: products.retailPricePaise,
      commissionType: products.commissionType,
      commissionFixedPaise: products.commissionFixedPaise,
      commissionPercent: products.commissionPercent,
      buyerDiscountPercent: products.buyerDiscountPercent,
      categoryName: categories.name,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.businessId, brand.id), eq(products.status, 'ACTIVE')))
    .orderBy(desc(products.createdAt));

  return {
    brand,
    products: brandProducts.map((p) => ({
      ...p,
      estimatedUnitCommissionPaise: computeEstimatedCommissionPerUnitPaise(p as { commissionType: 'PERCENTAGE' | 'FIXED_PER_SALE'; commissionFixedPaise: number | null; commissionPercent: number | null; buyerDiscountPercent: number; retailPricePaise: number }),
    })),
  };
}

export async function getPublicCreatorPage(handle: string) {
  const db = getDb();
  const cleanHandle = handle.trim().toLowerCase().replace(/^@/, '');

  const rows = await db
    .select({
      id: influencerProfiles.id,
      handle: influencerProfiles.handle,
      displayName: influencerProfiles.displayName,
      bio: influencerProfiles.bio,
      niche: influencerProfiles.niche,
      instagramUrl: influencerProfiles.instagramUrl,
      youtubeUrl: influencerProfiles.youtubeUrl,
      followerCount: influencerProfiles.followerCount,
      createdAt: influencerProfiles.createdAt,
      emailVerifiedAt: users.emailVerifiedAt,
      status: users.status,
    })
    .from(influencerProfiles)
    .innerJoin(users, eq(influencerProfiles.userId, users.id))
    .where(
      and(eq(influencerProfiles.handle, cleanHandle), eq(users.status, 'ACTIVE'))
    )
    .limit(1);

  const creator = rows[0];
  if (!creator) {
    throw new AppError('NOT_FOUND', 'Creator profile not found.', 404);
  }

  const activeCampaigns = await db
    .select({
      enrollmentId: enrollments.id,
      promoCode: enrollments.promoCode,
      totalSalesCount: enrollments.totalSalesCount,
      clicksCount: enrollments.clicksCount,
      productTitle: products.title,
      productSlug: products.slug,
      productImageUrl: products.imageUrl,
      retailPricePaise: products.retailPricePaise,
      buyerDiscountPercent: products.buyerDiscountPercent,
      brandName: businessProfiles.brandName,
      businessSlug: businessProfiles.slug,
    })
    .from(enrollments)
    .innerJoin(products, eq(enrollments.productId, products.id))
    .innerJoin(businessProfiles, eq(products.businessId, businessProfiles.id))
    .where(
      and(
        eq(enrollments.influencerId, creator.id),
        eq(enrollments.status, 'APPROVED'),
        eq(products.status, 'ACTIVE')
      )
    )
    .orderBy(desc(enrollments.totalSalesCount));

  const totalVerifiedSales = activeCampaigns.reduce(
    (sum, c) => sum + c.totalSalesCount,
    0
  );
  const totalLinkClicks = activeCampaigns.reduce((sum, c) => sum + c.clicksCount, 0);

  return {
    creator: {
      id: creator.id,
      handle: creator.handle,
      displayName: creator.displayName,
      bio: creator.bio,
      niche: creator.niche,
      instagramUrl: creator.instagramUrl,
      youtubeUrl: creator.youtubeUrl,
      followerCount: creator.followerCount,
      verified: Boolean(creator.emailVerifiedAt),
      joinedAt: creator.createdAt,
    },
    stats: {
      activeCampaignsCount: activeCampaigns.length,
      totalVerifiedSales,
      totalLinkClicks,
    },
    activeCampaigns,
  };
}
