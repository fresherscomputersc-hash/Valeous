import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { payments, webhookEvents } from '@/server/db/schema';
import { getPaymentProvider } from '@/server/payments/mock-provider';
import { recordAuditLog } from '@/server/audit/audit.service';

export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-provider-signature');

  const signatureValid = provider.verifyWebhookSignature(rawBody, signatureHeader);
  if (!signatureValid) {
    return NextResponse.json(
      { error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' } },
      { status: 401 }
    );
  }

  let event;
  try {
    event = provider.parseWebhookEvent(rawBody);
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_PAYLOAD', message: 'Malformed webhook payload.' } },
      { status: 400 }
    );
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(and(eq(webhookEvents.provider, event.provider), eq(webhookEvents.eventId, event.eventId)))
    .limit(1);

  if (existing) {
    // Blueprint Ch. 8 / Ch. 20 Scenario 3: duplicate webhook returns 200 with no side effects
    return NextResponse.json({ received: true, duplicate: true });
  }

  await db.transaction(async (tx) => {
    await tx.insert(webhookEvents).values({
      provider: event.provider,
      eventId: event.eventId,
      eventType: event.type,
      signatureValid: true,
      payloadRef: rawBody.slice(0, 4000),
      result: event.type === 'payment.captured' ? 'PROCESSED_CAPTURED' : 'PROCESSED_FAILED',
    });

    if (event.type === 'payment.captured') {
      await tx
        .update(payments)
        .set({
          providerPaymentId: event.paymentId,
          status: 'CAPTURED',
          capturedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(payments.providerOrderId, event.orderId));
    } else if (event.type === 'payment.failed') {
      await tx
        .update(payments)
        .set({
          status: 'FAILED',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(payments.providerOrderId, event.orderId));
    }

    await recordAuditLog(
      {
        actorUserId: null,
        action: 'PAYMENT_WEBHOOK_PROCESSED',
        targetType: 'PAYMENT_ORDER',
        targetId: event.orderId,
        metadata: {
          provider: event.provider,
          eventId: event.eventId,
          type: event.type,
          amountPaise: event.amountPaise,
        },
      },
      tx
    );
  });

  return NextResponse.json({ received: true, duplicate: false });
}
