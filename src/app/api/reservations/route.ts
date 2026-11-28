import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import { createReservationHold } from '@/server/services/reservation.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    const idempotencyKey = request.headers.get('idempotency-key') ?? '';
    const body = await request.json();
    const result = await createReservationHold(actor.user.id, idempotencyKey, body);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
