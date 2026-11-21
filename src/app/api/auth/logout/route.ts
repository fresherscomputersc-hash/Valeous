import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import {
  clearSessionCookie,
  resolveActorFromRequest,
  verifyMutationOrigin,
} from '@/server/auth/session';
import { logoutSession } from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await resolveActorFromRequest(request);

    if (actor) {
      await logoutSession(actor.sessionId);
    }

    const response = NextResponse.json({ success: true });
    clearSessionCookie(response, request);
    return response;
  } catch (err) {
    return toErrorResponse(err);
  }
}
