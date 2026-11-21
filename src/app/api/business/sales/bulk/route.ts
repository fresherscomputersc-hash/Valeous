import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireBusiness } from '@/server/permissions/rbac';
import { bulkImportPromoSales } from '@/server/services/sales-wallet.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    await enforcePersistentRateLimit({
      namespace: 'business:sales-bulk',
      key: actor.user.id,
      limit: 10,
      windowMs: 5 * 60 * 1000,
    });

    const body = await request.json();
    const summary = await bulkImportPromoSales({
      businessId: actor.businessProfile.id,
      actorUserId: actor.user.id,
      rawInput: body,
    });

    return NextResponse.json({ summary });
  } catch (err) {
    return toErrorResponse(err);
  }
}
