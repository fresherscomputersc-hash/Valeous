import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { randomUUID } from 'crypto';

export const userRoleEnum = ['INFLUENCER', 'BUSINESS', 'ADMIN', 'CUSTOMER'] as const;
export type UserRole = (typeof userRoleEnum)[number];
export const accountStatusEnum = ['ACTIVE', 'SUSPENDED'] as const;
export type AccountStatus = (typeof accountStatusEnum)[number];
export const commissionTypeEnum = ['FIXED_PER_SALE', 'PERCENTAGE'] as const;
export type CommissionType = (typeof commissionTypeEnum)[number];
export const productStatusEnum = ['ACTIVE', 'PAUSED', 'ENDED'] as const;
export type ProductStatus = (typeof productStatusEnum)[number];
export const enrollmentStatusEnum = ['PENDING', 'APPROVED', 'REJECTED', 'PAUSED'] as const;
export type EnrollmentStatus = (typeof enrollmentStatusEnum)[number];
export const promoSaleStatusEnum = ['PENDING_CLEARANCE', 'CONFIRMED', 'REFUNDED'] as const;
export type PromoSaleStatus = (typeof promoSaleStatusEnum)[number];
export const brandWalletTxTypeEnum = ['DEPOSIT', 'SALE_COMMISSION_DEBIT', 'SALE_REFUND_CREDIT'] as const;
export type BrandWalletTxType = (typeof brandWalletTxTypeEnum)[number];
export const payoutStatusEnum = ['PENDING', 'PAID', 'REJECTED'] as const;
export type PayoutStatus = (typeof payoutStatusEnum)[number];

export const users = sqliteTable(
  'users',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    role: text('role').notNull(),
    avatarUrl: text('avatar_url'),
    status: text('status').notNull().default('ACTIVE'),
    emailVerifiedAt: text('email_verified_at'),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    index('users_role_idx').on(t.role),
  ]
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_unique').on(t.tokenHash),
    index('sessions_user_id_idx').on(t.userId),
  ]
);

export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex('password_reset_tokens_hash_unique').on(t.tokenHash)]
);

export const emailVerificationTokens = sqliteTable(
  'email_verification_tokens',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('email_verification_tokens_hash_unique').on(t.tokenHash),
    index('email_verification_tokens_user_idx').on(t.userId),
  ]
);

export const rateLimitHits = sqliteTable(
  'rate_limit_hits',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    namespace: text('namespace').notNull(),
    key: text('key').notNull(),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [index('rate_limit_hits_lookup_idx').on(t.namespace, t.key, t.createdAt)]
);

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex('categories_slug_unique').on(t.slug)]
);

export const businessProfiles = sqliteTable(
  'business_profiles',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brandName: text('brand_name').notNull(),
    slug: text('slug').notNull(),
    categoryId: text('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    description: text('description').notNull(),
    websiteUrl: text('website_url'),
    city: text('city').notNull().default('Bhubaneswar'),
    gstin: text('gstin'),
    logoUrl: text('logo_url'),
    walletBalancePaise: integer('wallet_balance_paise').notNull().default(0),
    totalDepositedPaise: integer('total_deposited_paise').notNull().default(0),
    totalSpentPaise: integer('total_spent_paise').notNull().default(0),
    webhookKey: text('webhook_key').notNull(),
    webhookSecret: text('webhook_secret').notNull(),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('business_profiles_user_unique').on(t.userId),
    uniqueIndex('business_profiles_slug_unique').on(t.slug),
    uniqueIndex('business_profiles_webhook_key_unique').on(t.webhookKey),
    check(
      'business_wallet_nonnegative',
      sql`${t.walletBalancePaise} >= 0 AND ${t.totalDepositedPaise} >= 0 AND ${t.totalSpentPaise} >= 0`
    ),
  ]
);

export const brandWalletTransactions = sqliteTable(
  'brand_wallet_transactions',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    amountPaise: integer('amount_paise').notNull(),
    balanceAfterPaise: integer('balance_after_paise').notNull(),
    reference: text('reference'),
    description: text('description').notNull(),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [index('brand_wallet_tx_business_idx').on(t.businessId, t.createdAt)]
);

export const influencerProfiles = sqliteTable(
  'influencer_profiles',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    handle: text('handle').notNull(),
    displayName: text('display_name').notNull(),
    bio: text('bio').notNull(),
    niche: text('niche').notNull().default('Lifestyle & Creator'),
    instagramUrl: text('instagram_url'),
    youtubeUrl: text('youtube_url'),
    followerCount: integer('follower_count').notNull().default(0),
    upiId: text('upi_id'),
    bankAccountNumber: text('bank_account_number'),
    bankIfsc: text('bank_ifsc'),
    panNumber: text('pan_number'),
    bankDetailsNote: text('bank_details_note'),
    totalEarnedPaise: integer('total_earned_paise').notNull().default(0),
    pendingClearancePaise: integer('pending_clearance_paise').notNull().default(0),
    availableBalancePaise: integer('available_balance_paise').notNull().default(0),
    pendingPayoutPaise: integer('pending_payout_paise').notNull().default(0),
    totalPaidPaise: integer('total_paid_paise').notNull().default(0),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('influencer_profiles_user_unique').on(t.userId),
    uniqueIndex('influencer_profiles_handle_unique').on(t.handle),
    check(
      'influencer_wallet_nonnegative',
      sql`${t.availableBalancePaise} >= 0 AND ${t.pendingClearancePaise} >= 0 AND ${t.pendingPayoutPaise} >= 0 AND ${t.totalEarnedPaise} >= 0 AND ${t.totalPaidPaise} >= 0`
    ),
  ]
);

// NEW: Customer Profile Table
export const customerProfiles = sqliteTable(
  'customer_profiles',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    city: text('city').notNull().default('Bhubaneswar'),
    preferences: text('preferences').notNull().default('{}'), // JSON string for saved searches, interests, etc.
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('customer_profiles_user_unique').on(t.userId),
  ]
);

export const products = sqliteTable(
  'products',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    imageUrl: text('image_url'),
    imageAlt: text('image_alt'),
    externalProductUrl: text('external_product_url'),
    retailPricePaise: integer('retail_price_paise').notNull(),
    commissionType: text('commission_type').notNull(),
    commissionFixedPaise: integer('commission_fixed_paise'),
    commissionPercent: integer('commission_percent'),
    buyerDiscountPercent: integer('buyer_discount_percent').notNull().default(0),
    promoCodePrefix: text('promo_code_prefix'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('products_slug_unique').on(t.slug),
    index('products_business_idx').on(t.businessId),
    index('products_status_idx').on(t.status),
    check('products_price_positive', sql`${t.retailPricePaise} > 0`),
    check(
      'products_buyer_discount_range',
      sql`${t.buyerDiscountPercent} >= 0 AND ${t.buyerDiscountPercent} <= 80`
    ),
    check(
      'products_commission_valid',
      sql`(${t.commissionType} = 'FIXED_PER_SALE' AND ${t.commissionFixedPaise} IS NOT NULL AND ${t.commissionFixedPaise} > 0) OR (${t.commissionType} = 'PERCENTAGE' AND ${t.commissionPercent} IS NOT NULL AND ${t.commissionPercent} >= 1 AND ${t.commissionPercent} <= 90)`
    ),
  ]
);

export const enrollments = sqliteTable(
  'enrollments',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    influencerId: text('influencer_id')
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: 'cascade' }),
    pitchNote: text('pitch_note'),
    status: text('status').notNull().default('PENDING'),
    promoCode: text('promo_code'),
    rejectionReason: text('rejection_reason'),
    clicksCount: integer('clicks_count').notNull().default(0),
    totalSalesCount: integer('total_sales_count').notNull().default(0),
    totalUnitsSold: integer('total_units_sold').notNull().default(0),
    totalGrossSalesPaise: integer('total_gross_sales_paise').notNull().default(0),
    totalCommissionPaise: integer('total_commission_paise').notNull().default(0),
    appliedAt: text('applied_at').notNull().$default(() => new Date().toISOString()),
    decidedAt: text('decided_at'),
    updatedAt: text('updated_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('enrollments_product_influencer_unique').on(t.productId, t.influencerId),
    uniqueIndex('enrollments_promo_code_unique').on(t.promoCode),
    index('enrollments_influencer_idx').on(t.influencerId),
    index('enrollments_product_status_idx').on(t.productId, t.status),
  ]
);

export const promoClicks = sqliteTable(
  'promo_clicks',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    enrollmentId: text('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    influencerId: text('influencer_id')
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: 'cascade' }),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    referer: text('referer'),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    index('promo_clicks_enrollment_idx').on(t.enrollmentId, t.createdAt),
    index('promo_clicks_influencer_idx').on(t.influencerId, t.createdAt),
  ]
);

export const promoSales = sqliteTable(
  'promo_sales',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    enrollmentId: text('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'restrict' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    businessId: text('business_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'restrict' }),
    influencerId: text('influencer_id')
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: 'restrict' }),
    promoCodeSnapshot: text('promo_code_snapshot').notNull(),
    quantity: integer('quantity').notNull().default(1),
    grossAmountPaise: integer('gross_amount_paise').notNull(),
    commissionAmountPaise: integer('commission_amount_paise').notNull(),
    platformFeePaise: integer('platform_fee_paise').notNull().default(0),
    status: text('status').notNull().default('CONFIRMED'),
    clearsAt: text('clears_at'),
    refundReason: text('refund_reason'),
    refundedAt: text('refunded_at'),
    source: text('source').notNull().default('MANUAL'),
    orderReference: text('order_reference'),
    customerNote: text('customer_note'),
    loggedByUserId: text('logged_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    soldAt: text('sold_at').notNull().$default(() => new Date().toISOString()),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('promo_sales_business_order_ref_unique').on(t.businessId, t.orderReference),
    index('promo_sales_business_idx').on(t.businessId, t.soldAt),
    index('promo_sales_influencer_idx').on(t.influencerId, t.soldAt),
    index('promo_sales_enrollment_idx').on(t.enrollmentId),
    index('promo_sales_status_clears_idx').on(t.status, t.clearsAt),
    check(
      'promo_sales_positive',
      sql`${t.quantity} >= 1 AND ${t.grossAmountPaise} > 0 AND ${t.commissionAmountPaise} >= 0`
    ),
  ]
);

export const payoutRequests = sqliteTable(
  'payout_requests',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    influencerId: text('influencer_id')
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: 'restrict' }),
    amountPaise: integer('amount_paise').notNull(),
    payoutMethodSnapshot: text('payout_method_snapshot').notNull(),
    status: text('status').notNull().default('PENDING'),
    paymentReference: text('payment_reference'),
    note: text('note'),
    processedByUserId: text('processed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    requestedAt: text('requested_at').notNull().$default(() => new Date().toISOString()),
    processedAt: text('processed_at'),
  },
  (t) => [
    index('payout_requests_influencer_idx').on(t.influencerId, t.requestedAt),
    index('payout_requests_status_idx').on(t.status, t.requestedAt),
    check('payout_requests_positive', sql`${t.amountPaise} > 0`),
  ]
);

export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    href: text('href').notNull().default('/'),
    readAt: text('read_at'),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [index('notifications_user_created_idx').on(t.userId, t.createdAt)]
);

export const mediaAssets = sqliteTable(
  'media_assets',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    altText: text('alt_text'),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [uniqueIndex('media_assets_key_unique').on(t.storageKey)]
);

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').notNull().primaryKey().$default(() => randomUUID()),
    actorUserId: text('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reason: text('reason'),
    metadata: text('metadata').notNull().$default(() => '{}'),
    createdAt: text('created_at').notNull().$default(() => new Date().toISOString()),
  },
  (t) => [index('audit_logs_created_idx').on(t.createdAt)]
);
