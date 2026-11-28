import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from './uuid';

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

const utcNow = () => timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();
const utcUpdated = () => timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow();

export const users = pgTable(
  'users',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    email: text('email').notNull(),
    phone: text('phone'),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    role: text('role').notNull(),
    avatarUrl: text('avatar_url'),
    status: text('status').notNull().default('ACTIVE'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'string' }),
    phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true, mode: 'string' }),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    totpSecretEncrypted: text('totp_secret_encrypted'),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true, mode: 'string' }),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    uniqueIndex('users_phone_unique').on(t.phone),
    index('users_role_idx').on(t.role),
  ]
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: utcNow(),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_unique').on(t.tokenHash),
    index('sessions_user_id_idx').on(t.userId),
  ]
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'string' }),
    createdAt: utcNow(),
  },
  (t) => [uniqueIndex('password_reset_tokens_hash_unique').on(t.tokenHash)]
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true, mode: 'string' }),
    createdAt: utcNow(),
  },
  (t) => [
    uniqueIndex('email_verification_tokens_hash_unique').on(t.tokenHash),
    index('email_verification_tokens_user_idx').on(t.userId),
  ]
);

export const rateLimitHits = pgTable(
  'rate_limit_hits',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    namespace: text('namespace').notNull(),
    key: text('key').notNull(),
    createdAt: utcNow(),
  },
  (t) => [index('rate_limit_hits_lookup_idx').on(t.namespace, t.key, t.createdAt)]
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdAt: utcNow(),
  },
  (t) => [uniqueIndex('categories_slug_unique').on(t.slug)]
);

export const businessProfiles = pgTable(
  'business_profiles',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    brandName: text('brand_name').notNull(),
    slug: text('slug').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    description: text('description').notNull(),
    websiteUrl: text('website_url'),
    city: text('city').notNull().default('Bhubaneswar'),
    gstin: text('gstin'),
    logoUrl: text('logo_url'),
    walletBalancePaise: bigint('wallet_balance_paise', { mode: 'number' }).notNull().default(0),
    totalDepositedPaise: bigint('total_deposited_paise', { mode: 'number' }).notNull().default(0),
    totalSpentPaise: bigint('total_spent_paise', { mode: 'number' }).notNull().default(0),
    webhookKey: text('webhook_key').notNull(),
    webhookSecret: text('webhook_secret').notNull(),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
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

export const brandWalletTransactions = pgTable(
  'brand_wallet_transactions',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    balanceAfterPaise: bigint('balance_after_paise', { mode: 'number' }).notNull(),
    reference: text('reference'),
    description: text('description').notNull(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: utcNow(),
  },
  (t) => [index('brand_wallet_tx_business_idx').on(t.businessId, t.createdAt)]
);

export const influencerProfiles = pgTable(
  'influencer_profiles',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
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
    totalEarnedPaise: bigint('total_earned_paise', { mode: 'number' }).notNull().default(0),
    pendingClearancePaise: bigint('pending_clearance_paise', { mode: 'number' }).notNull().default(0),
    availableBalancePaise: bigint('available_balance_paise', { mode: 'number' }).notNull().default(0),
    pendingPayoutPaise: bigint('pending_payout_paise', { mode: 'number' }).notNull().default(0),
    totalPaidPaise: bigint('total_paid_paise', { mode: 'number' }).notNull().default(0),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
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

export const customerProfiles = pgTable(
  'customer_profiles',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    city: text('city').notNull().default('Bhubaneswar'),
    interests: text('interests')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    preferences: text('preferences').notNull().default('{}'),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [uniqueIndex('customer_profiles_user_unique').on(t.userId)]
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    imageUrl: text('image_url'),
    imageAlt: text('image_alt'),
    externalProductUrl: text('external_product_url'),
    retailPricePaise: bigint('retail_price_paise', { mode: 'number' }).notNull(),
    commissionType: text('commission_type').notNull(),
    commissionFixedPaise: bigint('commission_fixed_paise', { mode: 'number' }),
    commissionPercent: integer('commission_percent'),
    buyerDiscountPercent: integer('buyer_discount_percent').notNull().default(0),
    promoCodePrefix: text('promo_code_prefix'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
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

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    influencerId: uuid('influencer_id')
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: 'cascade' }),
    pitchNote: text('pitch_note'),
    status: text('status').notNull().default('PENDING'),
    promoCode: text('promo_code'),
    rejectionReason: text('rejection_reason'),
    clicksCount: integer('clicks_count').notNull().default(0),
    totalSalesCount: integer('total_sales_count').notNull().default(0),
    totalUnitsSold: integer('total_units_sold').notNull().default(0),
    totalGrossSalesPaise: bigint('total_gross_sales_paise', { mode: 'number' }).notNull().default(0),
    totalCommissionPaise: bigint('total_commission_paise', { mode: 'number' }).notNull().default(0),
    appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'string' }),
    updatedAt: utcUpdated(),
  },
  (t) => [
    uniqueIndex('enrollments_product_influencer_unique').on(t.productId, t.influencerId),
    uniqueIndex('enrollments_promo_code_unique').on(t.promoCode),
    index('enrollments_influencer_idx').on(t.influencerId),
    index('enrollments_product_status_idx').on(t.productId, t.status),
  ]
);

export const promoClicks = pgTable(
  'promo_clicks',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    influencerId: uuid('influencer_id')
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: 'cascade' }),
    ipHash: text('ip_hash'),
    userAgent: text('user_agent'),
    referer: text('referer'),
    createdAt: utcNow(),
  },
  (t) => [
    index('promo_clicks_enrollment_idx').on(t.enrollmentId, t.createdAt),
    index('promo_clicks_influencer_idx').on(t.influencerId, t.createdAt),
  ]
);

export const promoSales = pgTable(
  'promo_sales',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'restrict' }),
    influencerId: uuid('influencer_id')
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: 'restrict' }),
    promoCodeSnapshot: text('promo_code_snapshot').notNull(),
    quantity: integer('quantity').notNull().default(1),
    grossAmountPaise: bigint('gross_amount_paise', { mode: 'number' }).notNull(),
    commissionAmountPaise: bigint('commission_amount_paise', { mode: 'number' }).notNull(),
    platformFeePaise: bigint('platform_fee_paise', { mode: 'number' }).notNull().default(0),
    status: text('status').notNull().default('CONFIRMED'),
    clearsAt: timestamp('clears_at', { withTimezone: true, mode: 'string' }),
    refundReason: text('refund_reason'),
    refundedAt: timestamp('refunded_at', { withTimezone: true, mode: 'string' }),
    source: text('source').notNull().default('MANUAL'),
    orderReference: text('order_reference'),
    customerNote: text('customer_note'),
    loggedByUserId: uuid('logged_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    soldAt: timestamp('sold_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    createdAt: utcNow(),
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

export const payoutRequests = pgTable(
  'payout_requests',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    influencerId: uuid('influencer_id')
      .notNull()
      .references(() => influencerProfiles.id, { onDelete: 'restrict' }),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    payoutMethodSnapshot: text('payout_method_snapshot').notNull(),
    status: text('status').notNull().default('PENDING'),
    paymentReference: text('payment_reference'),
    note: text('note'),
    processedByUserId: uuid('processed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    requestedAt: timestamp('requested_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'string' }),
  },
  (t) => [
    index('payout_requests_influencer_idx').on(t.influencerId, t.requestedAt),
    index('payout_requests_status_idx').on(t.status, t.requestedAt),
    check('payout_requests_positive', sql`${t.amountPaise} > 0`),
  ]
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    href: text('href').notNull().default('/'),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'string' }),
    createdAt: utcNow(),
  },
  (t) => [index('notifications_user_created_idx').on(t.userId, t.createdAt)]
);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    altText: text('alt_text'),
    createdAt: utcNow(),
  },
  (t) => [uniqueIndex('media_assets_key_unique').on(t.storageKey)]
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    reason: text('reason'),
    metadata: text('metadata').notNull().$default(() => '{}'),
    createdAt: utcNow(),
  },
  (t) => [index('audit_logs_created_idx').on(t.createdAt)]
);

// ============================================================================
// VLS-105: Normalized Customer Need-to-Offer & Smart Value Passport Tables
// ============================================================================

export const needStatusEnum = ['OPEN', 'MATCHED', 'EXPIRED', 'CLOSED'] as const;
export type NeedStatus = (typeof needStatusEnum)[number];
export const offerClaimStateEnum = ['AVAILABLE', 'CLAIMED', 'REDEEMED', 'EXPIRED', 'REMOVED'] as const;
export type OfferClaimState = (typeof offerClaimStateEnum)[number];

export const needs = pgTable(
  'needs',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customerProfiles.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull().default('Customer Need'),
    categorySlug: text('category_slug'),
    city: text('city').notNull().default('Bhubaneswar'),
    budgetMaxPaise: bigint('budget_max_paise', { mode: 'number' }),
    notes: text('notes'),
    status: text('status').notNull().default('OPEN'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [
    index('needs_customer_idx').on(t.customerId, t.createdAt),
    index('needs_status_idx').on(t.status),
  ]
);

export const needResponses = pgTable(
  'need_responses',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    needId: uuid('need_id')
      .notNull()
      .references(() => needs.id, { onDelete: 'cascade' }),
    responderType: text('responder_type').notNull(), // 'BUSINESS' | 'CREATOR'
    responderId: uuid('responder_id').notNull(),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    message: text('message').notNull(),
    offeredPricePaise: bigint('offered_price_paise', { mode: 'number' }),
    status: text('status').notNull().default('SENT'),
    createdAt: utcNow(),
  },
  (t) => [index('need_responses_need_idx').on(t.needId, t.createdAt)]
);

export const offerClaims = pgTable(
  'offer_claims',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customerProfiles.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id, {
      onDelete: 'set null',
    }),
    state: text('state').notNull().default('CLAIMED'),
    claimedAt: timestamp('claimed_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    updatedAt: utcUpdated(),
  },
  (t) => [
    uniqueIndex('offer_claims_customer_product_unique').on(t.customerId, t.productId),
    index('offer_claims_customer_state_idx').on(t.customerId, t.state),
  ]
);

export const redemptions = pgTable(
  'redemptions',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => offerClaims.id, { onDelete: 'cascade' }),
    bookingRef: text('booking_ref'),
    status: text('status').notNull().default('REDEEMED'),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('redemptions_claim_unique').on(t.claimId),
    index('redemptions_redeemed_at_idx').on(t.redeemedAt),
  ]
);

// ============================================================================
// VLS-104: Reserved Product-Commerce Tables (behind PRODUCT_COMMERCE_ENABLED=false)
// ============================================================================

export const pcProducts = pgTable(
  'pc_products',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description').notNull(),
    basePricePaise: bigint('base_price_paise', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('DRAFT'),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [
    uniqueIndex('pc_products_slug_unique').on(t.slug),
    index('pc_products_business_idx').on(t.businessId),
    check('pc_products_price_positive', sql`${t.basePricePaise} > 0`),
  ]
);

export const pcProductVariants = pgTable(
  'pc_product_variants',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    productId: uuid('product_id')
      .notNull()
      .references(() => pcProducts.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    attributesJson: text('attributes_json').notNull().default('{}'),
    pricePaise: bigint('price_paise', { mode: 'number' }).notNull(),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [
    uniqueIndex('pc_product_variants_sku_unique').on(t.sku),
    index('pc_product_variants_product_idx').on(t.productId),
    check('pc_variants_price_positive', sql`${t.pricePaise} > 0`),
  ]
);

export const pcInventoryItems = pgTable(
  'pc_inventory_items',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => pcProductVariants.id, { onDelete: 'cascade' }),
    availableQty: integer('available_qty').notNull().default(0),
    reservedQty: integer('reserved_qty').notNull().default(0),
    updatedAt: utcUpdated(),
  },
  (t) => [
    uniqueIndex('pc_inventory_items_variant_unique').on(t.variantId),
    check('pc_inventory_nonnegative', sql`${t.availableQty} >= 0 AND ${t.reservedQty} >= 0`),
  ]
);

export const pcCarts = pgTable(
  'pc_carts',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemsJson: text('items_json').notNull().default('[]'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [index('pc_carts_user_idx').on(t.userId, t.status)]
);

export const pcOrders = pgTable(
  'pc_orders',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    orderNo: text('order_no').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businessProfiles.id, { onDelete: 'restrict' }),
    totalPaise: bigint('total_paise', { mode: 'number' }).notNull(),
    state: text('state').notNull().default('PENDING'),
    shippingJson: text('shipping_json').notNull().default('{}'),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [
    uniqueIndex('pc_orders_order_no_unique').on(t.orderNo),
    index('pc_orders_user_idx').on(t.userId, t.createdAt),
    check('pc_orders_total_positive', sql`${t.totalPaise} > 0`),
  ]
);

// ============================================================================
// VLS-106: Phone OTP, TOTP MFA & Organisation/Branch RBAC Tables
// ============================================================================

export const orgRoleEnum = [
  'ORG_OWNER',
  'BRANCH_MANAGER',
  'STAFF',
  'FINANCE',
  'READ_ONLY_ANALYST',
] as const;
export type OrgRole = (typeof orgRoleEnum)[number];

export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'string' }),
    createdAt: utcNow(),
  },
  (t) => [
    index('otp_challenges_phone_idx').on(t.phone, t.createdAt),
    index('otp_challenges_user_idx').on(t.userId),
  ]
);

export const organisations = pgTable(
  'organisations',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    legalName: text('legal_name').notNull(),
    tradeName: text('trade_name').notNull(),
    type: text('type').notNull().default('BUSINESS'),
    status: text('status').notNull().default('ACTIVE'),
    verificationStatus: text('verification_status').notNull().default('PENDING'),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [index('organisations_status_idx').on(t.status, t.verificationStatus)]
);

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    city: text('city').notNull().default('Bhubaneswar'),
    timezone: text('timezone').notNull().default('Asia/Kolkata'),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [index('branches_organisation_idx').on(t.organisationId)]
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organisationId: uuid('organisation_id')
      .notNull()
      .references(() => organisations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'cascade',
    }),
    orgRole: text('org_role').notNull(),
    status: text('status').notNull().default('ACTIVE'),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [
    uniqueIndex('memberships_user_org_branch_unique').on(t.userId, t.organisationId, t.branchId),
    index('memberships_user_idx').on(t.userId),
    index('memberships_org_idx').on(t.organisationId),
  ]
);

// ============================================================================
// VLS-107: Payments & Webhook Idempotency Tables
// ============================================================================

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    bookingId: uuid('booking_id').notNull(),
    provider: text('provider').notNull(),
    providerOrderId: text('provider_order_id').notNull(),
    providerPaymentId: text('provider_payment_id'),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('INR'),
    status: text('status').notNull().default('CREATED'),
    method: text('method'),
    idempotencyKey: text('idempotency_key').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true, mode: 'string' }),
    createdAt: utcNow(),
    updatedAt: utcUpdated(),
  },
  (t) => [
    uniqueIndex('payments_idempotency_key_unique').on(t.idempotencyKey),
    uniqueIndex('payments_provider_payment_unique').on(t.provider, t.providerPaymentId),
    index('payments_booking_idx').on(t.bookingId),
    check('payments_amount_positive', sql`${t.amountPaise} > 0`),
  ]
);

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').notNull().primaryKey().$defaultFn(uuidv7),
    provider: text('provider').notNull(),
    eventId: text('event_id').notNull(),
    eventType: text('event_type').notNull(),
    signatureValid: boolean('signature_valid').notNull(),
    payloadRef: text('payload_ref').notNull(),
    result: text('result').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('webhook_events_provider_event_unique').on(t.provider, t.eventId)]
);
