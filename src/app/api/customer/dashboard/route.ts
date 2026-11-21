import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireCustomer } from '@/server/permissions/rbac';
import { getHydratedPassport } from '@/server/services/customerDiscovery.service';
import { getCustomerProfileDetails } from '@/server/services/customer.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCustomer(request);
    const profile = await getCustomerProfileDetails(actor.customerProfile.id);
    const passport = await getHydratedPassport(actor.customerProfile.id);

    return NextResponse.json({
      profile,
      passport,
      stats: {
        savedOffersCount: passport.savedOffers.length,
        openRequestsCount: passport.requests.filter(
          (r) =>
            typeof r === 'object' &&
            r !== null &&
            'status' in r &&
            (r as { status?: string }).status === 'OPEN'
        ).length,
        interestsCount: passport.interests.length,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
