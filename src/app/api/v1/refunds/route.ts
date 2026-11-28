import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import { requestAndProcessBookingRefund } from '@/server/services/refund.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    const body = (await request.json()) as { bookingId?: string; reason?: string };
    if (!body.bookingId || !body.reason) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'bookingId and reason are required' } },
        { status: 400 }
      );
    }
    const refund = await requestAndProcessBookingRefund({
      bookingId: body.bookingId,
      actorUserId: actor.user.id,
      reason: body.reason,
    });
    return NextResponse.json({ refund }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
