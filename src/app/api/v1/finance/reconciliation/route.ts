import { NextRequest, NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { getDb } from '@/server/db';
import { reconciliationItems } from '@/server/db/schema';
import { requireAdmin } from '@/server/permissions/rbac';
import { runDailyReconciliation } from '@/server/services/ledger.service';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const db = getDb();
    const items = await db
      .select()
      .from(reconciliationItems)
      .orderBy(desc(reconciliationItems.createdAt))
      .limit(100);
    return NextResponse.json({ items });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    await requireAdmin(request);
    const body = (await request.json()) as {
      source?: string;
      items?: Array<{ reference: string; amountPaise: number }>;
    };
    const results = await runDailyReconciliation(
      body.source ?? 'mock-settlement',
      body.items ?? []
    );
    return NextResponse.json({ results }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
