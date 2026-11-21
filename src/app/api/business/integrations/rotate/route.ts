import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/errors';
import { verifyMutationOrigin } from '@/server/auth/session';
import { requireBusiness } from '@/server/permissions/rbac';
import {
  getBusinessProfileDetails,
  rotateBusinessWebhookSecret,
} from '@/server/services/marketplace.service';
import { ingestExternalStoreOrderWebhook } from '@/server/services/sales-wallet.service';

export async function POST(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    const credentials = await rotateBusinessWebhookSecret(
      actor.businessProfile.id,
      actor.user.id
    );
    return NextResponse.json({ credentials });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * 1-click self-test helper so Businesses can verify their HMAC webhook pipeline
 * directly from `/business/integrations` using an active promo code.
 */
export async function PUT(request: NextRequest) {
  try {
    verifyMutationOrigin(request);
    const actor = await requireBusiness(request);
    const body = (await request.json()) as {
      promoCode?: string;
      quantity?: number;
      grossAmountRupees?: number;
    };

    const profile = await getBusinessProfileDetails(actor.businessProfile.id);
    const payloadString = JSON.stringify({
      order_id: `TEST-WH-${Date.now().toString().slice(-6)}`,
      discount_code: body.promoCode || '',
      quantity: body.quantity || 1,
      total_price: body.grossAmountRupees,
      customerNote: 'Verified via Integrations Live Webhook Self-Test',
    });

    const signature = crypto
      .createHmac('sha256', profile.webhookSecret)
      .update(payloadString, 'utf8')
      .digest('hex');

    const result = await ingestExternalStoreOrderWebhook({
      webhookKey: profile.webhookKey,
      rawBody: payloadString,
      signatureHeader: `sha256=${signature}`,
    });

    return NextResponse.json({ result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
