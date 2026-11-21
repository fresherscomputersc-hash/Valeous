import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireBusiness } from '@/server/permissions/rbac';
import {
  getBusinessProfileDetails,
  listAllCategories,
  updateBusinessProfileDetails,
} from '@/server/services/marketplace.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireBusiness(request);
    const [profile, categories] = await Promise.all([
      getBusinessProfileDetails(actor.businessProfile.id),
      listAllCategories(),
    ]);
    return NextResponse.json({ profile, categories });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    const body = await request.json();
    const profile = await updateBusinessProfileDetails(
      actor.businessProfile.id,
      actor.user.id,
      body
    );
    return NextResponse.json({ profile });
  } catch (err) {
    return toErrorResponse(err);
  }
}
