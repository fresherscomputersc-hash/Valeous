import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireActor } from '@/server/permissions/rbac';
import {
  createOrganisation,
  listUserOrganisations,
} from '@/server/services/organisation.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireActor(request);
    const items = await listUserOrganisations(actor.user.id);
    return NextResponse.json({ organisations: items });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireActor(request);
    const body = await request.json();
    const organisation = await createOrganisation(actor.user.id, body);
    return NextResponse.json({ organisation }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
