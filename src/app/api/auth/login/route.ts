import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { enforcePersistentRateLimit } from '@/lib/rate-limit';
import {
  attachSessionCookie,
  getRequestMeta,
  verifyMutationOrigin,
} from '@/server/auth/session';
import { loginUser } from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const meta = await getRequestMeta(request);
    await enforcePersistentRateLimit({
      namespace: 'auth:login',
      key: meta.ipAddress,
      limit: 25,
      windowMs: 15 * 60 * 1000,
    });

    const body = await request.json();
    const { user, session } = await loginUser(body, meta);

    const response = NextResponse.json(
      { user, sessionToken: session.cookieValue },
      { status: 200 }
    );
    attachSessionCookie(response, session.cookieValue, session.expiresAt, request);
    return response;
  } catch (err) {
    return toErrorResponse(err);
  }
}
