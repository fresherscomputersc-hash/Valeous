import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireBusiness } from '@/server/permissions/rbac';
import { decideEnrollmentByBusiness } from '@/server/services/enrollment.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    const { id } = await context.params;
    const body = await request.json();

    const enrollment = await decideEnrollmentByBusiness({
      enrollmentId: id,
      businessId: actor.businessProfile.id,
      actorUserId: actor.user.id,
      rawInput: body,
    });
    return NextResponse.json({ enrollment });
  } catch (err) {
    return toErrorResponse(err);
  }
}
