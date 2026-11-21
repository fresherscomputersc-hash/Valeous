import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireCustomer } from '@/server/permissions/rbac';
import { getProofBasedRecommendations } from '@/server/services/customerDiscovery.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCustomer(request);
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 6;
    const recommendations = await getProofBasedRecommendations(
      actor.customerProfile.id,
      Number.isFinite(limit) ? limit : 6
    );

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
