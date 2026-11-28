import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireOrgRole } from '@/server/permissions/rbac';
import { createService, searchCatalogue } from '@/server/services/catalogue.service';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') ?? undefined;
    const city = request.nextUrl.searchParams.get('city') ?? undefined;
    const results = await searchCatalogue({ q, city });
    return NextResponse.json({ services: results });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const body = (await request.json()) as { organisationId?: string };
    if (!body.organisationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'organisationId is required' } },
        { status: 400 }
      );
    }
    const actor = await requireOrgRole(
      ['ORG_OWNER', 'BRANCH_MANAGER'],
      body.organisationId,
      null,
      request
    );
    const service = await createService(actor.user.id, body.organisationId, body);
    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
