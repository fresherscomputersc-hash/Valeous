import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireOrgRole } from '@/server/permissions/rbac';
import { submitKycVerification } from '@/server/services/organisation.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    verifyMutationOrigin(request);
    const { id } = await context.params;
    const actor = await requireOrgRole(['ORG_OWNER'], id, null, request);
    const body = await request.json();
    const verification = await submitKycVerification(actor.user.id, id, body);
    return NextResponse.json({ verification }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
