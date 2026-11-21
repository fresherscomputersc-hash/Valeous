import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireInfluencer } from '@/server/permissions/rbac';
import {
  getInfluencerProfileDetails,
  updateInfluencerProfileDetails,
} from '@/server/services/marketplace.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireInfluencer(request);
    const profile = await getInfluencerProfileDetails(actor.influencerProfile.id);
    return NextResponse.json({ profile });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireInfluencer(request);
    const body = await request.json();
    const profile = await updateInfluencerProfileDetails(
      actor.influencerProfile.id,
      actor.user.id,
      body
    );
    return NextResponse.json({ profile });
  } catch (err) {
    return toErrorResponse(err);
  }
}
