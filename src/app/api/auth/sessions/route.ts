import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import {
  listUserActiveSessions,
  revokeOtherUserSessions,
} from '@/server/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const sessions = await listUserActiveSessions(actor.user.id, actor.sessionId);
    return NextResponse.json({ sessions });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    const result = await revokeOtherUserSessions(actor.user.id, actor.sessionId);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
