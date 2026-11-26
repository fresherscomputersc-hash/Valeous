import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getEnv } from '@/lib/env';
import type {
  CreatePaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  RefundPaymentInput,
  RefundPaymentResult,
  VerifiedWebhookEvent,
} from './provider';

export type MockWebhookScenario = 'success' | 'fail' | 'late' | 'duplicate';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  private getWebhookSecret(): string {
    return getEnv().WEBHOOK_HMAC_SECRET || 'dev-webhook-hmac-secret-32-chars-min';
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
      throw new Error('amountPaise must be a positive integer');
    }
    return {
      provider: this.name,
      providerOrderId: `mock_ord_${input.bookingId.slice(0, 8)}_${Date.now()}`,
      providerPaymentId: null,
      amountPaise: input.amountPaise,
      currency: input.currency,
      status: 'CREATED',
      checkoutUrl: `${getEnv().APP_URL}/mock-checkout?order=${encodeURIComponent(input.bookingId)}`,
    };
  }

  async getPaymentStatus(providerOrderId: string): Promise<PaymentIntentResult> {
    return {
      provider: this.name,
      providerOrderId,
      providerPaymentId: `mock_pay_${providerOrderId.slice(-8)}`,
      amountPaise: 0,
      currency: 'INR',
      status: 'CAPTURED',
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    return {
      provider: this.name,
      providerRefundId: `mock_ref_${randomUUID().slice(0, 8)}`,
      amountPaise: input.amountPaise,
      status: 'REFUNDED',
    };
  }

  signWebhookPayload(rawBody: string, timestampSec = Math.floor(Date.now() / 1000)): string {
    const digest = createHmac('sha256', this.getWebhookSecret())
      .update(`${timestampSec}.${rawBody}`)
      .digest('hex');
    return `t=${timestampSec},v1=${digest}`;
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;

    const parts = Object.fromEntries(
      signatureHeader.split(',').map((segment) => {
        const [k, v] = segment.trim().split('=');
        return [k, v];
      })
    );

    const timestampSec = Number(parts.t);
    const v1 = parts.v1;
    if (!Number.isFinite(timestampSec) || !v1) return false;

    // 5-minute replay window
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > 300) return false;

    const expected = createHmac('sha256', this.getWebhookSecret())
      .update(`${timestampSec}.${rawBody}`)
      .digest('hex');

    const a = Buffer.from(v1, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  parseWebhookEvent(rawBody: string): VerifiedWebhookEvent {
    const parsed = JSON.parse(rawBody) as Partial<VerifiedWebhookEvent>;
    if (!parsed.eventId || !parsed.type || !parsed.paymentId || !parsed.orderId) {
      throw new Error('Malformed mock webhook payload');
    }
    return {
      provider: this.name,
      eventId: parsed.eventId,
      type: parsed.type,
      paymentId: parsed.paymentId,
      orderId: parsed.orderId,
      amountPaise: Number(parsed.amountPaise ?? 0),
      currency: 'INR',
      occurredAt: parsed.occurredAt ?? new Date().toISOString(),
    };
  }

  /**
   * Generates a signed webhook payload & header for testing Success, Fail, Late, or Duplicate
   * webhook deliveries against POST /api/webhooks/payments.
   */
  buildSimulatedWebhook(params: {
    scenario: MockWebhookScenario;
    orderId: string;
    paymentId?: string;
    eventId?: string;
    amountPaise: number;
  }): { rawBody: string; signatureHeader: string; event: VerifiedWebhookEvent } {
    const eventId =
      params.eventId ??
      (params.scenario === 'duplicate' ? `evt_dup_${params.orderId}` : `evt_${randomUUID()}`);
    const occurredAt =
      params.scenario === 'late'
        ? new Date(Date.now() - 6 * 60 * 1000).toISOString()
        : new Date().toISOString();

    const event: VerifiedWebhookEvent = {
      provider: this.name,
      eventId,
      type: params.scenario === 'fail' ? 'payment.failed' : 'payment.captured',
      paymentId: params.paymentId ?? `mock_pay_${randomUUID().slice(0, 8)}`,
      orderId: params.orderId,
      amountPaise: params.amountPaise,
      currency: 'INR',
      occurredAt,
    };

    const rawBody = JSON.stringify(event);
    const signatureHeader = this.signWebhookPayload(rawBody);
    return { rawBody, signatureHeader, event };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}
