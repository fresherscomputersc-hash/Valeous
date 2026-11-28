import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireOrgRole } from '@/server/permissions/rbac';
import { getServiceById, updateService } from '@/server/services/catalogue.service';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const service = await getServiceById(id);
    return NextResponse.json({ service });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    verifyMutationOrigin(request);
    const { id } = await context.params;
    const existing = await getServiceById(id);
    const actor = await requireOrgRole(
      ['ORG_OWNER', 'BRANCH_MANAGER'],
      existing.organisationId,
      existing.branchId,
      request
    );
    const body = await request.json();
    const service = await updateService(actor.user.id, id, body);
    return NextResponse.json({ service });
  } catch (err) {
    return toErrorResponse(err);
  }
}
