import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { toErrorResponse } from '@/lib/errors';
import { getDb } from '@/server/db';
import { ledgerEntries, ledgerTransactions } from '@/server/db/schema';
import { requireAdmin } from '@/server/permissions/rbac';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const db = getDb();
    const transactions = await db
      .select()
      .from(ledgerTransactions)
      .orderBy(desc(ledgerTransactions.createdAt))
      .limit(50);
    const entries = await db
      .select()
      .from(ledgerEntries)
      .orderBy(desc(ledgerEntries.createdAt))
      .limit(200);
    return NextResponse.json({ transactions, entries });
  } catch (err) {
    return toErrorResponse(err);
  }
}
