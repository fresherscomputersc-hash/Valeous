import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireCustomer } from '@/server/permissions/rbac';
import {
  createCustomerRequest,
  listCustomerRequests,
} from '@/server/services/customer.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCustomer(request);
    const requests = await listCustomerRequests(actor.customerProfile.id);
    return NextResponse.json({ requests, count: requests.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireCustomer(request);
    await enforcePersistentRateLimit({
      namespace: 'customer:request',
      key: actor.user.id,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    const body = await request.json();
    const created = await createCustomerRequest(
      actor.customerProfile.id,
      actor.user.id,
      body
    );

    return NextResponse.json({ request: created }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
