import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import { getRequestMeta, verifyMutationOrigin } from '@/server/auth/session';
import { verifyPhoneOtp } from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const meta = await getRequestMeta(request);
    await enforcePersistentRateLimit({
      namespace: 'auth:otp-verify',
      key: meta.ipAddress,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    const body = await request.json();
    const result = await verifyPhoneOtp(body);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
