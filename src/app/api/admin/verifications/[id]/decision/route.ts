import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireAdmin } from '@/server/permissions/rbac';
import { decideVerification } from '@/server/services/organisation.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    verifyMutationOrigin(request);
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const body = await request.json();
    const verification = await decideVerification(admin.user.id, id, body);
    return NextResponse.json({ verification });
  } catch (err) {
    return toErrorResponse(err);
  }
}
