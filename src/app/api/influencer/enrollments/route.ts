import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireInfluencer } from '@/server/permissions/rbac';
import {
  applyForProductEnrollment,
  listInfluencerCampaigns,
} from '@/server/services/enrollment.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireInfluencer(request);
    const campaigns = await listInfluencerCampaigns(actor.influencerProfile.id);
    const productId = request.nextUrl.searchParams.get('productId');
    if (productId) {
      const match = campaigns.find((c) => c.productId === productId) || null;
      return NextResponse.json({ enrollment: match });
    }
    return NextResponse.json({ campaigns });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireInfluencer(request);
    await enforcePersistentRateLimit({
      namespace: 'influencer:enroll',
      key: actor.user.id,
      limit: 25,
      windowMs: 10 * 60 * 1000,
    });

    const body = await request.json();
    const enrollment = await applyForProductEnrollment(
      actor.influencerProfile.id,
      actor.user.id,
      body
    );
    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
