import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireBusiness } from '@/server/permissions/rbac';
import { updateBusinessProduct } from '@/server/services/marketplace.service';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    const { id } = await context.params;
    const body = await request.json();
    const product = await updateBusinessProduct(
      id,
      actor.businessProfile.id,
      actor.user.id,
      body
    );
    return NextResponse.json({ product });
  } catch (err) {
    return toErrorResponse(err);
  }
}
