import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { getRequestMeta, resolveActorFromRequest, verifyMutationOrigin } from '@/server/auth/session';
import { requestPhoneOtp } from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const meta = await getRequestMeta(request);
    await enforcePersistentRateLimit({
      namespace: 'auth:otp-request',
      key: meta.ipAddress,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });

    const actor = await resolveActorFromRequest(request);
    const body = await request.json();
    const result = await requestPhoneOtp(body, actor?.user.id ?? null);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
