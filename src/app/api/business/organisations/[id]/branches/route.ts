import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireOrgRole } from '@/server/permissions/rbac';
import {
  createBranch,
  listOrganisationBranches,
} from '@/server/services/organisation.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await requireOrgRole(
      ['ORG_OWNER', 'BRANCH_MANAGER', 'STAFF', 'FINANCE', 'READ_ONLY_ANALYST'],
      id,
      null,
      request
    );
    const items = await listOrganisationBranches(id);
    return NextResponse.json({ branches: items });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    verifyMutationOrigin(request);
    const { id } = await context.params;
    const actor = await requireOrgRole(['ORG_OWNER'], id, null, request);
    const body = await request.json();
    const branch = await createBranch(actor.user.id, id, body);
    return NextResponse.json({ branch }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
