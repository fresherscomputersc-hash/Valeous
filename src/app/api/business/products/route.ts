import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireBusiness } from '@/server/permissions/rbac';
import {
  listAllCategories,
  listBusinessOwnProducts,
} from '@/server/services/marketplace.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireBusiness(request);
    const [products, categories] = await Promise.all([
      listBusinessOwnProducts(actor.businessProfile.id),
      listAllCategories(),
    ]);
    return NextResponse.json({ products, categories });
  } catch (err) {
    return toErrorResponse(err);
  }
}
