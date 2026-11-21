import 'dotenv/config';
import path from 'node:path';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { getDb } from '@/server/db';

async function runMigrations(databaseFile: string): Promise<void> {
  const db = getDb();
  try {
    migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), 'drizzle/migrations'),
    });
    console.log('SQLite (libsql) migrations applied cleanly.');
  } finally {
    // libsql client is managed globally
  }
}

async function main() {
  const file = process.env.DATABASE_FILE;
  if (!file) {
    throw new Error('DATABASE_FILE is required to run migrations');
  }
  console.log(`Applying libsql SQLite migrations to ${file}...`);
  await runMigrations(file);
}

if (require.main === module || process.argv[1]?.endsWith('migrate.ts')) {
  main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
