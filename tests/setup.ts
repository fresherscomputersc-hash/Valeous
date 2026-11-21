import 'dotenv/config';
import { resetEnvCacheForTests } from '@/lib/env';
import { clearRateLimitsForTests } from '@/lib/rate-limit';
import { closeDbPool, getDb } from '@/server/db';
import { sql } from 'drizzle-orm';
import { afterAll, beforeEach } from 'vitest';

process.env.DATABASE_FILE =
  process.env.TEST_DATABASE_FILE ||
  'file:./storage/d2c_mvp_test.sqlite';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'test-session-secret-at-least-thirty-two-bytes-long-12345';
process.env.CLAIM_CODE_SECRET =
  process.env.CLAIM_CODE_SECRET ||
  'test-claim-hmac-secret-at-least-thirty-two-bytes-long-67890';
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
  await db.run(sql`DELETE FROM rate_limit_hits`);
  await db.run(sql`DELETE FROM notifications`);
  await db.run(sql`DELETE FROM promo_clicks`);
  await db.run(sql`DELETE FROM brand_wallet_transactions`);
  await db.run(sql`DELETE FROM audit_logs`);
  await db.run(sql`DELETE FROM payout_requests`);
  await db.run(sql`DELETE FROM promo_sales`);
  await db.run(sql`DELETE FROM enrollments`);
  await db.run(sql`DELETE FROM products`);
  await db.run(sql`DELETE FROM influencer_profiles`);
  await db.run(sql`DELETE FROM business_profiles`);
  await db.run(sql`DELETE FROM customer_profiles`);
  await db.run(sql`DELETE FROM categories`);
  await db.run(sql`DELETE FROM email_verification_tokens`);
  await db.run(sql`DELETE FROM password_reset_tokens`);
  await db.run(sql`DELETE FROM sessions`);
  await db.run(sql`DELETE FROM media_assets`);
  await db.run(sql`DELETE FROM users`);
}
