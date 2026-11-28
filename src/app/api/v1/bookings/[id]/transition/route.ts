import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import { bookingStateEnum, type BookingState } from '@/server/db/schema';
import { transitionBookingState } from '@/server/services/booking.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    const { id } = await context.params;
    const body = (await request.json()) as { toState?: string; reason?: string };

    if (!body.toState || !bookingStateEnum.includes(body.toState as BookingState)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Valid toState is required' } },
        { status: 400 }
      );
    }

    const booking = await transitionBookingState({
      bookingId: id,
      toState: body.toState as BookingState,
      actorUserId: actor.user.id,
      reason: body.reason,
    });
    return NextResponse.json({ booking });
  } catch (err) {
    return toErrorResponse(err);
  }
}
