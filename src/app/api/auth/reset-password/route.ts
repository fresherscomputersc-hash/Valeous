import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  clearSessionCookie,
  getRequestMeta,
  verifyMutationOrigin,
} from '@/server/auth/session';
import { resetPasswordWithToken } from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const meta = await getRequestMeta(request);
    checkRateLimit({
      namespace: 'auth:reset-password',
      key: meta.ipAddress,
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    await resetPasswordWithToken(body);

    const response = NextResponse.json({
      success: true,
      message: 'Your password has been updated. Please sign in with your new password.',
    });
    clearSessionCookie(response, request);
    return response;
  } catch (err) {
    return toErrorResponse(err);
  }
}
