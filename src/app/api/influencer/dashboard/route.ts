import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireInfluencer } from '@/server/permissions/rbac';
import { listInfluencerCampaigns } from '@/server/services/enrollment.service';
import { listInfluencerSalesAndWallet } from '@/server/services/sales-wallet.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireInfluencer(request);
    const [campaigns, walletData] = await Promise.all([
      listInfluencerCampaigns(actor.influencerProfile.id),
      listInfluencerSalesAndWallet(actor.influencerProfile.id),
    ]);

    return NextResponse.json({
      actor,
      campaigns,
      ...walletData,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
