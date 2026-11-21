import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getRequestMeta, verifyMutationOrigin } from '@/server/auth/session';
import { requestPasswordReset } from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const meta = await getRequestMeta(request);
    checkRateLimit({
      namespace: 'auth:forgot-password',
      key: meta.ipAddress,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    await requestPasswordReset(body);

    return NextResponse.json({
      accepted: true,
      message:
        'If an active account exists for that email address, password recovery instructions have been sent.',
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
