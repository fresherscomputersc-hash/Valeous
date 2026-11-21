import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { resolveActorFromRequest } from '@/server/auth/session';

export async function GET(request: NextRequest) {
  try {
    const actor = await resolveActorFromRequest(request);
    return NextResponse.json({ actor });
  } catch (err) {
    return toErrorResponse(err);
  }
}
