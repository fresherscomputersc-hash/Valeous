import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import { scanQrToken } from '@/server/services/qr.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    const body = (await request.json()) as { token?: string; deviceId?: string };
    if (!body.token) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'token is required' } },
        { status: 400 }
      );
    }
    const result = await scanQrToken(
      body.token,
      body.deviceId ?? 'web-scanner',
      actor.user.id
    );
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
