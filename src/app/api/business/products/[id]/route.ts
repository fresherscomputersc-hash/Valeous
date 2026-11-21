import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireBusiness } from '@/server/permissions/rbac';
import {
  getBusinessOwnProductById,
  listAllCategories,
} from '@/server/services/marketplace.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireBusiness(request);
    const { id } = await context.params;
    const [product, categories] = await Promise.all([
      getBusinessOwnProductById(id, actor.businessProfile.id),
      listAllCategories(),
    ]);
    return NextResponse.json({ product, categories });
  } catch (err) {
    return toErrorResponse(err);
  }
}
