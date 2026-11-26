import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import { verifyTotpMfa } from '@/server/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    const body = await request.json();
    const result = await verifyTotpMfa(actor.user.id, body);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
