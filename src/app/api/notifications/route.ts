import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import {
  listUserNotifications,
  markNotificationsRead,
} from '@/server/services/notification.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const data = await listUserNotifications(actor.user.id);
    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    const body = (await request.json().catch(() => ({}))) as {
      notificationId?: string;
    };
    await markNotificationsRead(actor.user.id, body.notificationId);
    const data = await listUserNotifications(actor.user.id);
    return NextResponse.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}
