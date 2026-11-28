export type PaymentCurrency = 'INR';

export type PaymentIntentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED';

export interface CreatePaymentIntentInput {
  bookingId: string;
  amountPaise: number;
  currency: PaymentCurrency;
  idempotencyKey: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentIntentResult {
  provider: string;
  providerOrderId: string;
  providerPaymentId: string | null;
  amountPaise: number;
  currency: PaymentCurrency;
  status: PaymentIntentStatus;
  checkoutUrl?: string;
}

export interface RefundPaymentInput {
  providerPaymentId: string;
  amountPaise: number;
  idempotencyKey: string;
  reason?: string;
}

export interface RefundPaymentResult {
  provider: string;
  providerRefundId: string;
  amountPaise: number;
  status: 'PENDING' | 'REFUNDED' | 'FAILED';
}

export interface VerifiedWebhookEvent {
  provider: string;
  eventId: string;
  type: 'payment.captured' | 'payment.failed' | 'refund.processed';
  paymentId: string;
  orderId: string;
  amountPaise: number;
  currency: PaymentCurrency;
  occurredAt: string;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  getPaymentStatus(providerOrderId: string): Promise<PaymentIntentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
  parseWebhookEvent(rawBody: string): VerifiedWebhookEvent;
}
