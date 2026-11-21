import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireActor } from '@/server/permissions/rbac';
import { getInfluencerPayoutReceipt } from '@/server/services/sales-wallet.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request);
    const { id } = await context.params;
    const receipt = await getInfluencerPayoutReceipt({
      payoutId: id,
      viewerRole: actor.user.role,
      viewerInfluencerId: actor.influencerProfile?.id ?? null,
    });
    return NextResponse.json({ receipt });
  } catch (err) {
    return toErrorResponse(err);
  }
}
