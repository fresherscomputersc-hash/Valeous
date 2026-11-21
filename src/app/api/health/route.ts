import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/server/db';

export async function GET() {
  try {
    const db = getDb();
    await db.run(sql`SELECT 1`);
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        database: 'unreachable',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
