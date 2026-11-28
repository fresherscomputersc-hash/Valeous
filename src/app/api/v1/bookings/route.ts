import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import { createBookingFromReservation } from '@/server/services/booking.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    const body = await request.json();
    const booking = await createBookingFromReservation(actor.user.id, body);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
