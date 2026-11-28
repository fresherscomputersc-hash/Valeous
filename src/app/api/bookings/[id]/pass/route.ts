import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { requireActor } from '@/server/permissions/rbac';
import { issueBookingQrPass } from '@/server/services/qr.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireActor(request);
    const { id } = await context.params;
    const pass = await issueBookingQrPass(id, actor.user.id);
    return NextResponse.json({ pass });
  } catch (err) {
    return toErrorResponse(err);
  }
}
