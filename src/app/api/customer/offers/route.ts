import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireCustomer } from '@/server/permissions/rbac';
import { matchOffersForCustomer } from '@/server/services/customerDiscovery.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCustomer(request);
    const sp = request.nextUrl.searchParams;

    const offers = await matchOffersForCustomer(actor.customerProfile.id, {
      q: sp.get('q') || undefined,
      categorySlug: sp.get('categorySlug') || undefined,
      commissionType: sp.get('commissionType') || undefined,
      sort: sp.get('sort') || undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
    });

    return NextResponse.json({ offers, count: offers.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}
