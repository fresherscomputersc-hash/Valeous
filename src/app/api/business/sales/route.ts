import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireBusiness } from '@/server/permissions/rbac';
import {
  listBusinessPromoSales,
  logOrPreviewPromoSale,
} from '@/server/services/sales-wallet.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireBusiness(request);
    const status = request.nextUrl.searchParams.get('status') || undefined;
    const q = request.nextUrl.searchParams.get('q') || undefined;
    const sales = await listBusinessPromoSales(actor.businessProfile.id, {
      limit: 150,
      status,
      q,
    });
    return NextResponse.json({ sales });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    await enforcePersistentRateLimit({
      namespace: 'business:sales-log',
      key: actor.user.id,
      limit: 80,
      windowMs: 60 * 1000,
    });

    const body = await request.json();
    const result = await logOrPreviewPromoSale({
      businessId: actor.businessProfile.id,
      actorUserId: actor.user.id,
      rawInput: body,
      source: 'MANUAL',
    });
    return NextResponse.json({ result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
