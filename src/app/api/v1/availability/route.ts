import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireOrgRole } from '@/server/permissions/rbac';
import {
  createAvailabilitySlot,
  listAvailabilitySlots,
} from '@/server/services/availability.service';

export async function GET(request: NextRequest) {
  try {
    const itemType = request.nextUrl.searchParams.get('itemType') as 'service' | 'event' | null;
    const itemId = request.nextUrl.searchParams.get('itemId');
    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'itemType and itemId are required' } },
        { status: 400 }
      );
    }
    const slots = await listAvailabilitySlots({
      itemType,
      itemId,
      fromIso: request.nextUrl.searchParams.get('from') ?? undefined,
      toIso: request.nextUrl.searchParams.get('to') ?? undefined,
    });
    return NextResponse.json({ slots });
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
    const slot = await createAvailabilitySlot(actor.user.id, body);
    return NextResponse.json({ slot }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
