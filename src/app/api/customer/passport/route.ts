import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireCustomer } from '@/server/permissions/rbac';
import { customerSaveOfferSchema } from '@/server/validation/schemas';
import { getHydratedPassport } from '@/server/services/customerDiscovery.service';
import {
  removeOfferFromPassport,
  saveOfferToPassport,
} from '@/server/services/customer.service';

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCustomer(request);
    const passport = await getHydratedPassport(actor.customerProfile.id);
    return NextResponse.json({ passport });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireCustomer(request);
    const body = await request.json();
    const parsed = customerSaveOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message || 'Invalid offer',
          },
        },
        { status: 400 }
      );
    }

    await saveOfferToPassport(
      actor.customerProfile.id,
      actor.user.id,
      parsed.data.productId
    );
    const passport = await getHydratedPassport(actor.customerProfile.id);
    return NextResponse.json({ passport }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireCustomer(request);
    const productId = request.nextUrl.searchParams.get('productId');
    if (!productId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'productId is required' } },
        { status: 400 }
      );
    }

    await removeOfferFromPassport(
      actor.customerProfile.id,
      actor.user.id,
      productId
    );
    const passport = await getHydratedPassport(actor.customerProfile.id);
    return NextResponse.json({ passport });
  } catch (err) {
    return toErrorResponse(err);
  }
}
