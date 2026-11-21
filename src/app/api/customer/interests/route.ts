import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireCustomer } from '@/server/permissions/rbac';
import { updateCustomerInterests } from '@/server/services/customer.service';

export async function PATCH(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireCustomer(request);
    const body = await request.json();
    const interests = Array.isArray(body?.interests)
      ? body.interests.filter((v: unknown) => typeof v === 'string')
      : [];

    const prefs = await updateCustomerInterests(
      actor.customerProfile.id,
      actor.user.id,
      interests
    );
    return NextResponse.json({ preferences: prefs });
  } catch (err) {
    return toErrorResponse(err);
  }
}
