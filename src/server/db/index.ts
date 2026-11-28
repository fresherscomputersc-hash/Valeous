import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnv } from '@/lib/env';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

type TransactionCallback = Parameters<Database['transaction']>[0];

/** A database handle that also accepts a drizzle transaction object. */
export type DbExecutor = Database | Parameters<TransactionCallback>[0];

declare global {
  // eslint-disable-next-line no-var
  var __valueousPg:
    | {
        db: Database;
        client: postgres.Sql;
      }
    | undefined;
}

export function getDb(): Database {
  if (!globalThis.__valueousPg) {
    const env = getEnv();
    const client = postgres(env.DATABASE_URL, {
      max: env.NODE_ENV === 'production' ? 10 : 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    globalThis.__valueousPg = {
      db: drizzle(client, { schema }),
      client,
    };
  }
  return globalThis.__valueousPg.db;
}

export async function closeDbPool(): Promise<void> {
  if (globalThis.__valueousPg) {
    await globalThis.__valueousPg.client.end({ timeout: 5 });
    globalThis.__valueousPg = undefined;
  }
}
