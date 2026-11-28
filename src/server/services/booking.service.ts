import { randomUUID } from 'node:crypto';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { getDb, type DbExecutor } from '@/server/db';
import {
  availability,
  bookingEvents,
  bookings,
  bookingStateEnum,
  reservations,
  type BookingState,
} from '@/server/db/schema';
import { recordAuditLog } from '@/server/audit/audit.service';

export const ALLOWED_BOOKING_TRANSITIONS: Record<BookingState, readonly BookingState[]> = {
  Draft: ['Held', 'Cancelled'],
  Held: ['Pending Payment', 'Cancelled'],
  'Pending Payment': ['Pending Approval', 'Confirmed', 'Cancelled'],
  'Pending Approval': ['Confirmed', 'Cancelled', 'Refund Pending'],
  Confirmed: ['Checked In', 'Completed', 'Cancelled'],
  'Checked In': ['Completed'],
  Completed: ['Disputed', 'Closed'],
  Cancelled: ['Refund Pending', 'Closed'],
  'Refund Pending': ['Refunded'],
  Refunded: ['Closed'],
  Disputed: ['Refunded', 'Closed'],
  Closed: [],
};

export function assertValidBookingTransition(
  fromState: BookingState,
  toState: BookingState
): void {
  if (!bookingStateEnum.includes(toState)) {
    throw new AppError('INVALID_STATE_TRANSITION', `Unknown booking state: ${toState}`, 400);
  }
  const allowed = ALLOWED_BOOKING_TRANSITIONS[fromState] ?? [];
  if (!allowed.includes(toState)) {
    throw new AppError(
      'INVALID_STATE_TRANSITION',
      `Cannot transition booking from "${fromState}" to "${toState}".`,
      409
    );
  }
}

const createBookingSchema = z.object({
  reservationId: z.string().uuid(),
  organisationId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  parentBookingId: z.string().uuid().optional().nullable(),
  totalPaise: z.coerce.number().int().positive(),
  priceBreakup: z.record(z.string(), z.unknown()).default({}),
  policySnapshot: z.record(z.string(), z.unknown()).default({}),
  attributionId: z.string().uuid().optional().nullable(),
  offerClaimId: z.string().uuid().optional().nullable(),
});

export async function createBookingFromReservation(
  userId: string,
  rawInput: unknown
) {
  const parsed = createBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid booking payload.',
      400
    );
  }

  const d = parsed.data;
  const db = getDb();
  const nowIso = new Date().toISOString();

  return db.transaction(async (tx) => {
    const [res] = await tx
      .select()
      .from(reservations)
      .where(eq(reservations.id, d.reservationId))
      .limit(1);

    if (!res) {
      throw new AppError('NOT_FOUND', 'Reservation hold not found.', 404);
    }
    if (res.userId !== userId) {
      throw new AppError('FORBIDDEN', 'Reservation belongs to another user.', 403);
    }
    if (res.status !== 'held') {
      throw new AppError('HOLD_EXPIRED', 'Reservation hold is no longer active.', 409);
    }
    if (new Date(res.expiresAt).getTime() <= Date.now()) {
      await tx
        .update(reservations)
        .set({ status: 'expired' })
        .where(eq(reservations.id, res.id));
      await tx
        .update(availability)
        .set({
          reserved: sql`GREATEST(0, ${availability.reserved} - ${res.quantity})`,
          updatedAt: nowIso,
        })
        .where(eq(availability.id, res.availabilityId));
      throw new AppError('HOLD_EXPIRED', '5-minute reservation hold has expired.', 409);
    }

    const bookingNo = `BK-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const [booking] = await tx
      .insert(bookings)
      .values({
        bookingNo,
        userId,
        organisationId: d.organisationId,
        branchId: d.branchId ?? null,
        parentBookingId: d.parentBookingId ?? null,
        reservationId: res.id,
        availabilityId: res.availabilityId,
        state: 'Pending Payment',
        quantity: res.quantity,
        totalPaise: d.totalPaise,
        priceBreakupJson: JSON.stringify(d.priceBreakup),
        policySnapshotJson: JSON.stringify(d.policySnapshot),
        attributionId: d.attributionId ?? null,
        offerClaimId: d.offerClaimId ?? null,
      })
      .returning();

    await tx.insert(bookingEvents).values({
      bookingId: booking!.id,
      fromState: 'Held',
      toState: 'Pending Payment',
      actorUserId: userId,
      reason: 'Checkout initiated from held reservation',
    });

    await recordAuditLog(
      {
        actorUserId: userId,
        action: 'BOOKING_CREATED',
        targetType: 'BOOKING',
        targetId: booking!.id,
        metadata: { bookingNo, totalPaise: d.totalPaise, parentBookingId: d.parentBookingId ?? null },
      },
      tx
    );

    return booking!;
  });
}

export async function transitionBookingState(
  params: {
    bookingId: string;
    toState: BookingState;
    actorUserId: string | null;
    reason?: string;
  },
  txOrDb?: DbExecutor
) {
  const execute = async (tx: DbExecutor) => {
    const [current] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, params.bookingId))
      .limit(1);

    if (!current) {
      throw new AppError('NOT_FOUND', 'Booking not found.', 404);
    }

    const fromState = current.state as BookingState;
    assertValidBookingTransition(fromState, params.toState);

    const nowIso = new Date().toISOString();
    const [updated] = await tx
      .update(bookings)
      .set({ state: params.toState, updatedAt: nowIso })
      .where(eq(bookings.id, params.bookingId))
      .returning();

    // Update reservation & availability counters on Confirmed / Cancelled
    if (params.toState === 'Confirmed' && current.reservationId && current.availabilityId) {
      await tx
        .update(reservations)
        .set({ status: 'converted' })
        .where(eq(reservations.id, current.reservationId));
      await tx
        .update(availability)
        .set({
          reserved: sql`GREATEST(0, ${availability.reserved} - ${current.quantity})`,
          confirmed: sql`${availability.confirmed} + ${current.quantity}`,
          version: sql`${availability.version} + 1`,
          updatedAt: nowIso,
        })
        .where(eq(availability.id, current.availabilityId));
    } else if (params.toState === 'Cancelled' && current.availabilityId) {
      if (fromState === 'Confirmed' || fromState === 'Pending Approval') {
        await tx
          .update(availability)
          .set({
            confirmed: sql`GREATEST(0, ${availability.confirmed} - ${current.quantity})`,
            version: sql`${availability.version} + 1`,
            updatedAt: nowIso,
          })
          .where(eq(availability.id, current.availabilityId));
      } else if (current.reservationId) {
        await tx
          .update(reservations)
          .set({ status: 'expired' })
          .where(eq(reservations.id, current.reservationId));
        await tx
          .update(availability)
          .set({
            reserved: sql`GREATEST(0, ${availability.reserved} - ${current.quantity})`,
            version: sql`${availability.version} + 1`,
            updatedAt: nowIso,
          })
          .where(eq(availability.id, current.availabilityId));
      }
    }

    await tx.insert(bookingEvents).values({
      bookingId: current.id,
      fromState,
      toState: params.toState,
      actorUserId: params.actorUserId,
      reason: params.reason ?? null,
    });

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        action: 'BOOKING_STATE_TRANSITION',
        targetType: 'BOOKING',
        targetId: current.id,
        reason: params.reason ?? null,
        metadata: { fromState, toState: params.toState },
      },
      tx
    );

    return updated!;
  };

  if (txOrDb) {
    return execute(txOrDb);
  }
  return getDb().transaction(execute);
}

export async function getBookingWithEvents(bookingId: string) {
  const db = getDb();
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!booking) {
    throw new AppError('NOT_FOUND', 'Booking not found.', 404);
  }

  const events = await db
    .select()
    .from(bookingEvents)
    .where(eq(bookingEvents.bookingId, bookingId))
    .orderBy(desc(bookingEvents.createdAt));

  return { booking, events };
}
