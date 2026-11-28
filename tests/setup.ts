import 'dotenv/config';
import { resetEnvCacheForTests } from '@/lib/env';
import { clearRateLimitsForTests } from '@/lib/rate-limit';
import { closeDbPool, getDb } from '@/server/db';
import { sql } from 'drizzle-orm';
import { afterAll, beforeEach } from 'vitest';

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://valueous:valueous_dev_password@localhost:5432/valueous';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'test-session-secret-at-least-thirty-two-bytes-long-12345';
process.env.CLAIM_CODE_SECRET =
  process.env.CLAIM_CODE_SECRET ||
  'test-claim-hmac-secret-at-least-thirty-two-bytes-long-67890';
process.env.WEBHOOK_HMAC_SECRET =
  process.env.WEBHOOK_HMAC_SECRET ||
  'test-webhook-hmac-secret-at-least-thirty-two-bytes-long-999';
process.env.CRON_SECRET =
  process.env.CRON_SECRET || 'test-cron-housekeeping-secret-1234567890';

resetEnvCacheForTests();

beforeEach(async () => {
  await clearRateLimitsForTests();
});

afterAll(async () => {
  await closeDbPool();
});

const APP_TABLES = [
  'redemptions',
  'offer_claims',
  'need_responses',
  'needs',
  'webhook_events',
  'payments',
  'pc_orders',
  'pc_carts',
  'pc_inventory_items',
  'pc_product_variants',
  'pc_products',
  'otp_challenges',
  'memberships',
  'branches',
  'organisations',
  'rate_limit_hits',
  'notifications',
  'promo_clicks',
  'brand_wallet_transactions',
  'audit_logs',
  'payout_requests',
  'promo_sales',
  'enrollments',
  'products',
  'influencer_profiles',
  'business_profiles',
  'customer_profiles',
  'categories',
  'email_verification_tokens',
  'password_reset_tokens',
  'sessions',
  'media_assets',
  'users',
] as const;

export async function truncateAllTables(): Promise<void> {
  const db = getDb();
  const tableList = APP_TABLES.map((t) => `"${t}"`).join(', ');
  await db.execute(sql.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`));
}
