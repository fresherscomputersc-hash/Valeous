import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireBusiness } from '@/server/permissions/rbac';
import { listBusinessEnrollments } from '@/server/services/enrollment.service';
import {
  listAllCategories,
  listBusinessOwnProducts,
} from '@/server/services/marketplace.service';
import {
  getBusinessDashboardMetrics,
  listBusinessPromoSales,
} from '@/server/services/sales-wallet.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireBusiness(request);
    const [metrics, products, enrollments, recentSales, categories] = await Promise.all([
      getBusinessDashboardMetrics(actor.businessProfile.id),
      listBusinessOwnProducts(actor.businessProfile.id),
      listBusinessEnrollments(actor.businessProfile.id),
      listBusinessPromoSales(actor.businessProfile.id, { limit: 100 }),
      listAllCategories(),
    ]);

    return NextResponse.json({
      actor,
      metrics,
      products,
      enrollments,
      recentSales,
      categories,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
