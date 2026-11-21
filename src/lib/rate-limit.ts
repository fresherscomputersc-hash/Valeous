import { and, eq, gt, lt } from 'drizzle-orm';
import { AppError } from './errors';
import { getDb } from '@/server/db';
import { rateLimitHits } from '@/server/db/schema';

interface Bucket {
  timestamps: number[];
}

const memoryBuckets = new Map<string, Bucket>();

export interface RateLimitRule {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}

/**
 * Fast synchronous in-memory check (used as instant first-line shield & unit helper).
 */
export function checkRateLimit(rule: RateLimitRule): { remaining: number; resetAtMs: number } {
  const now = Date.now();
  const compositeKey = `${rule.namespace}:${rule.key}`;
  const cutoff = now - rule.windowMs;

  const existing = memoryBuckets.get(compositeKey);
  const active = existing ? existing.timestamps.filter((t) => t > cutoff) : [];

  if (active.length >= rule.limit) {
    const oldest = active[0] ?? now;
    const retrySeconds = Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000));
    throw new AppError(
      'RATE_LIMITED',
      `Too many attempts. Please wait ${retrySeconds}s before trying again.`,
      429
    );
  }

  active.push(now);
  memoryBuckets.set(compositeKey, { timestamps: active });

  return {
    remaining: Math.max(0, rule.limit - active.length),
    resetAtMs: (active[0] ?? now) + rule.windowMs,
  };
}

/**
 * Production persistent PostgreSQL-backed rate limiter so rate limits survive
 * multi-instance deployments and server restarts.
 */
export async function enforcePersistentRateLimit(
  rule: RateLimitRule
): Promise<{ remaining: number; resetAtMs: number }> {
  const now = Date.now();
  const cutoffDate = new Date(now - rule.windowMs).toISOString();

  try {
    const db = getDb();
    const recent = await db
      .select({ createdAt: rateLimitHits.createdAt })
      .from(rateLimitHits)
      .where(
        and(
          eq(rateLimitHits.namespace, rule.namespace),
          eq(rateLimitHits.key, rule.key),
          gt(rateLimitHits.createdAt, cutoffDate)
        )
      );

    if (recent.length >= rule.limit) {
      const oldestMs = Math.min(...recent.map((r) => new Date(r.createdAt).getTime()));
      const retrySeconds = Math.max(1, Math.ceil((oldestMs + rule.windowMs - now) / 1000));
      throw new AppError(
        'RATE_LIMITED',
        `Too many attempts. Please wait ${retrySeconds}s before trying again.`,
        429
      );
    }

    await db.insert(rateLimitHits).values({
      namespace: rule.namespace,
      key: rule.key,
    });

    return {
      remaining: Math.max(0, rule.limit - (recent.length + 1)),
      resetAtMs: now + rule.windowMs,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    // Fallback to memory bucket if DB is momentarily unreachable
    return checkRateLimit(rule);
  }
}

export async function purgeExpiredRateLimitHits(olderThanMs = 24 * 60 * 60 * 1000): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  await db.delete(rateLimitHits).where(lt(rateLimitHits.createdAt, cutoff));
}

export async function clearRateLimitsForTests(): Promise<void> {
  memoryBuckets.clear();
  try {
    const db = getDb();
    await db.delete(rateLimitHits);
  } catch {
    // ignore if DB not initialized in pure unit tests
  }
}
