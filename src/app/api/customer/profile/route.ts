import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireCustomer } from '@/server/permissions/rbac';
import {
  getCustomerProfileDetails,
  updateCustomerProfileDetails,
} from '@/server/services/customer.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCustomer(request);
    const profile = await getCustomerProfileDetails(actor.customerProfile.id);
    return NextResponse.json({ profile });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireCustomer(request);
    const body = await request.json();
    const profile = await updateCustomerProfileDetails(
      actor.customerProfile.id,
      actor.user.id,
      body
    );
    return NextResponse.json({ profile });
  } catch (err) {
    return toErrorResponse(err);
  }
}
