import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireBusiness } from '@/server/permissions/rbac';
import {
  createBusinessProduct,
  listMarketplaceProducts,
} from '@/server/services/marketplace.service';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const items = await listMarketplaceProducts({
      q: sp.get('q') || undefined,
      categorySlug: sp.get('category') || undefined,
      commissionType: sp.get('commissionType') || undefined,
      sort: sp.get('sort') || undefined,
    });
    return NextResponse.json({ products: items });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    const body = await request.json();
    const product = await createBusinessProduct(
      actor.businessProfile.id,
      actor.user.id,
      body
    );
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
