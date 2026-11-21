import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireAdmin } from '@/server/permissions/rbac';
import { updateAdminUserStatus } from '@/server/services/sales-wallet.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    verifyMutationOrigin(request);
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    const body = await request.json();
    const user = await updateAdminUserStatus({
      targetUserId: id,
      adminUserId: admin.user.id,
      rawInput: body,
    });
    return NextResponse.json({ user });
  } catch (err) {
    return toErrorResponse(err);
  }
}
