import path from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

let pgContainer: StartedPostgreSqlContainer | undefined;
let redisContainer: StartedTestContainer | undefined;

export async function setup(): Promise<() => Promise<void>> {
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
  process.env.PRODUCT_COMMERCE_ENABLED = process.env.PRODUCT_COMMERCE_ENABLED || 'false';
  process.env.PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'mock';

  const [startedPg, startedRedis] = await Promise.all([
    new PostgreSqlContainer('postgis/postgis:17-3.5-alpine')
      .withDatabase('valueous_test')
      .withUsername('valueous')
      .withPassword('valueous_test_password')
      .start(),
    new GenericContainer('redis:7-alpine').withExposedPorts(6379).start(),
  ]);

  pgContainer = startedPg;
  redisContainer = startedRedis;

  const pgUri = startedPg.getConnectionUri();
  const redisUri = `redis://${startedRedis.getHost()}:${startedRedis.getMappedPort(6379)}`;

  process.env.DATABASE_URL = pgUri;
  process.env.TEST_DATABASE_URL = pgUri;
  process.env.REDIS_URL = redisUri;

  const client = postgres(pgUri, { max: 1 });
  try {
    await client`CREATE EXTENSION IF NOT EXISTS citext`;
    await client`CREATE EXTENSION IF NOT EXISTS postgis`;
    const db = drizzle(client);
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), 'drizzle/migrations'),
    });
  } finally {
    await client.end({ timeout: 5 });
  }

  return async () => {
    await Promise.allSettled([pgContainer?.stop(), redisContainer?.stop()]);
  };
}
