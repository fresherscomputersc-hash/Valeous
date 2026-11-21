import path from 'node:path';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { getEnv } from '@/lib/env';
import * as schema from './schema';

export type Database = LibSQLDatabase<typeof schema>;

type TransactionCallback = Parameters<Database['transaction']>[0];

/** A database handle that also accepts a drizzle transaction object. */
export type DbExecutor = Database | Parameters<TransactionCallback>[0];

declare global {
  // eslint-disable-next-line no-var
  var __d2cLibSql: {
    db: Database;
    client: ReturnType<typeof createClient>;
  } | undefined;
}

export function getDb(): Database {
  if (!globalThis.__d2cLibSql) {
    const env = getEnv();
    const filePath = env.DATABASE_FILE.replace(/^file:/, '');
    const absolutePath = path.resolve(filePath);
    const url = `file:///${absolutePath.replace(/\\/g, '/')}`;
    const client = createClient({ url });
    client.execute('PRAGMA busy_timeout = 10000').catch(() => {});
    globalThis.__d2cLibSql = { db: drizzle(client), client };
  }
  return globalThis.__d2cLibSql.db;
}

export async function closeDbPool(): Promise<void> {
  if (globalThis.__d2cLibSql) {
    await globalThis.__d2cLibSql.client.close();
    globalThis.__d2cLibSql = undefined;
  }
}


