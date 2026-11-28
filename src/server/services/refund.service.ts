import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import { bookings, payments, refunds, type BookingState } from '@/server/db/schema';
import { getPaymentProvider } from '@/server/payments/mock-provider';
import { transitionBookingState } from './booking.service';
import { reverseBookingLedger } from './ledger.service';
import { recordAuditLog } from '@/server/audit/audit.service';

export interface CancellationPolicySnapshot {
  refundPercent?: number;
}

export function computeRefundAmountPaise(
  totalPaise: number,
  policySnapshotJson: string
): number {
  let pct = 100;
  try {
    const parsed = JSON.parse(policySnapshotJson || '{}') as CancellationPolicySnapshot;
    if (
      typeof parsed.refundPercent === 'number' &&
      parsed.refundPercent >= 0 &&
      parsed.refundPercent <= 100
    ) {
      pct = parsed.refundPercent;
    }
  } catch {
    pct = 100;
  }
  return Math.round((totalPaise * pct) / 100);
}

export async function requestAndProcessBookingRefund(params: {
  bookingId: string;
  actorUserId: string;
  reason: string;
}) {
  const db = getDb();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, params.bookingId))
    .limit(1);

  if (!booking) {
    throw new AppError('NOT_FOUND', 'Booking not found.', 404);
  }

  const refundAmountPaise = computeRefundAmountPaise(
    booking.totalPaise,
    booking.policySnapshotJson
  );
  if (refundAmountPaise <= 0) {
    throw new AppError('VALIDATION_ERROR', 'Booking policy does not allow a refund.', 400);
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.bookingId, booking.id))
    .limit(1);

  const provider = getPaymentProvider();
  const providerResult = await provider.refundPayment({
    providerPaymentId: payment?.providerPaymentId ?? `mock_pay_${booking.id.slice(0, 8)}`,
    amountPaise: refundAmountPaise,
    idempotencyKey: `refund_${booking.id}`,
    reason: params.reason,
  });

  return db.transaction(async (tx) => {
    const currentState = booking.state as BookingState;
    if (currentState === 'Confirmed') {
      await transitionBookingState(
        {
          bookingId: booking.id,
          toState: 'Cancelled',
          actorUserId: params.actorUserId,
          reason: params.reason,
        },
        tx
      );
    }

    await transitionBookingState(
      {
        bookingId: booking.id,
        toState: 'Refund Pending',
        actorUserId: params.actorUserId,
        reason: params.reason,
      },
      tx
    );

    const [refundRow] = await tx
      .insert(refunds)
      .values({
        paymentId: payment?.id ?? null,
        bookingId: booking.id,
        amountPaise: refundAmountPaise,
        reason: params.reason,
        status: 'REFUNDED',
        providerRefundId: providerResult.providerRefundId,
        requestedByUserId: params.actorUserId,
        approvedByUserId: params.actorUserId,
      })
      .returning();

    await reverseBookingLedger(
      {
        bookingId: booking.id,
        organisationId: booking.organisationId,
        refundPaise: refundAmountPaise,
      },
      tx
    );

    await transitionBookingState(
      {
        bookingId: booking.id,
        toState: 'Refunded',
        actorUserId: params.actorUserId,
        reason: `Provider refund ${providerResult.providerRefundId} confirmed`,
      },
      tx
    );

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        action: 'BOOKING_REFUNDED',
        targetType: 'REFUND',
        targetId: refundRow!.id,
        reason: params.reason,
        metadata: {
          bookingId: booking.id,
          refundAmountPaise,
          providerRefundId: providerResult.providerRefundId,
        },
      },
      tx
    );

    return refundRow!;
  });
}
