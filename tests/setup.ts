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

export async function truncateAllTables(): Promise<void> {
  const db = getDb();
  // Delete child tables first (FK order: children before parents)
  await db.execute(sql`DELETE FROM redemptions`);
  await db.execute(sql`DELETE FROM offer_claims`);
  await db.execute(sql`DELETE FROM need_responses`);
  await db.execute(sql`DELETE FROM needs`);
  await db.execute(sql`DELETE FROM webhook_events`);
  await db.execute(sql`DELETE FROM payments`);
  await db.execute(sql`DELETE FROM pc_orders`);
  await db.execute(sql`DELETE FROM pc_carts`);
  await db.execute(sql`DELETE FROM pc_inventory_items`);
  await db.execute(sql`DELETE FROM pc_product_variants`);
  await db.execute(sql`DELETE FROM pc_products`);
  await db.execute(sql`DELETE FROM otp_challenges`);
  await db.execute(sql`DELETE FROM memberships`);
  await db.execute(sql`DELETE FROM branches`);
  await db.execute(sql`DELETE FROM organisations`);
  await db.execute(sql`DELETE FROM rate_limit_hits`);
  await db.execute(sql`DELETE FROM notifications`);
  await db.execute(sql`DELETE FROM promo_clicks`);
  await db.execute(sql`DELETE FROM brand_wallet_transactions`);
  await db.execute(sql`DELETE FROM audit_logs`);
  await db.execute(sql`DELETE FROM payout_requests`);
  await db.execute(sql`DELETE FROM promo_sales`);
  await db.execute(sql`DELETE FROM enrollments`);
  await db.execute(sql`DELETE FROM products`);
  await db.execute(sql`DELETE FROM influencer_profiles`);
  await db.execute(sql`DELETE FROM business_profiles`);
  await db.execute(sql`DELETE FROM customer_profiles`);
  await db.execute(sql`DELETE FROM categories`);
  await db.execute(sql`DELETE FROM email_verification_tokens`);
  await db.execute(sql`DELETE FROM password_reset_tokens`);
  await db.execute(sql`DELETE FROM sessions`);
  await db.execute(sql`DELETE FROM media_assets`);
  await db.execute(sql`DELETE FROM users`);
}
