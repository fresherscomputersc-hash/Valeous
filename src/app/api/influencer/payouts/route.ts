import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireInfluencer } from '@/server/permissions/rbac';
import { requestInfluencerPayout } from '@/server/services/sales-wallet.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireInfluencer(request);
    checkRateLimit({
      namespace: 'influencer:payout',
      key: actor.user.id,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const payout = await requestInfluencerPayout(
      actor.influencerProfile.id,
      actor.user.id,
      body
    );
    return NextResponse.json({ payout }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
