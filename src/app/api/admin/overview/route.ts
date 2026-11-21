import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireAdmin } from '@/server/permissions/rbac';
import { getAdminPlatformOverview } from '@/server/services/sales-wallet.service';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const overview = await getAdminPlatformOverview();
    return NextResponse.json({ overview });
  } catch (err) {
    return toErrorResponse(err);
  }
}
