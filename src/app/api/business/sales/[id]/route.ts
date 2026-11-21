import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireBusiness } from '@/server/permissions/rbac';
import { resolvePromoSaleByBusiness } from '@/server/services/sales-wallet.service';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    const { id } = await context.params;
    const body = await request.json();

    const result = await resolvePromoSaleByBusiness({
      saleId: id,
      businessId: actor.businessProfile.id,
      actorUserId: actor.user.id,
      rawInput: body,
    });

    return NextResponse.json({ result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
