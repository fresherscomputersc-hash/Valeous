import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import { changeUserPassword } from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    await enforcePersistentRateLimit({
      namespace: 'auth:change-password',
      key: actor.user.id,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    await changeUserPassword({
      userId: actor.user.id,
      currentSessionId: actor.sessionId,
      rawInput: body,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
