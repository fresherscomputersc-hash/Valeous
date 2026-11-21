import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { getRequestMeta, verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import {
  resendEmailVerification,
  verifyEmailWithToken,
} from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const meta = await getRequestMeta(request);
    await enforcePersistentRateLimit({
      namespace: 'auth:verify-email',
      key: meta.ipAddress,
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const user = await verifyEmailWithToken(body);
    return NextResponse.json({ verified: true, user });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    await enforcePersistentRateLimit({
      namespace: 'auth:resend-verify',
      key: actor.user.id,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    const result = await resendEmailVerification(actor.user.id);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
