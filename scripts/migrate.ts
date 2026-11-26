import 'dotenv/config';
import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { closeDbPool, getDb } from '@/server/db';

async function runMigrations(): Promise<void> {
  const db = getDb();
  try {
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), 'drizzle/migrations'),
    });
    console.log('PostgreSQL 17 migrations applied cleanly.');
  } finally {
    await closeDbPool();
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to run migrations');
  }
  console.log('Applying PostgreSQL 17 migrations...');
  await runMigrations();
}

if (require.main === module || process.argv[1]?.endsWith('migrate.ts')) {
  main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
