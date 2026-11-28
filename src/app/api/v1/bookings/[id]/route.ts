import { NextRequest, NextResponse } from 'next/server';
import { AppError, toErrorResponse } from '@/lib/errors';
import { requireActor } from '@/server/permissions/rbac';
import { getBookingWithEvents } from '@/server/services/booking.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request);
    const { id } = await context.params;
    const result = await getBookingWithEvents(id);
    if (result.booking.userId !== actor.user.id && actor.user.role !== 'ADMIN') {
      throw new AppError('FORBIDDEN', 'You do not have access to this booking.', 403);
    }
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
