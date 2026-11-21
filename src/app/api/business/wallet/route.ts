import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireBusiness } from '@/server/permissions/rbac';
import {
  depositBrandWallet,
  getBusinessWalletOverview,
} from '@/server/services/sales-wallet.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireBusiness(request);
    const overview = await getBusinessWalletOverview(actor.businessProfile.id);
    return NextResponse.json(overview);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    await enforcePersistentRateLimit({
      namespace: 'business:wallet-topup',
      key: actor.user.id,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    const body = await request.json();
    const result = await depositBrandWallet({
      businessId: actor.businessProfile.id,
      actorUserId: actor.user.id,
      rawInput: body,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
