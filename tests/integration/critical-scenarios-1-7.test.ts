import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db';
import {
  availability,
  bookingEvents,
  bookings,
  ledgerEntries,
  ledgerTransactions,
  payments,
  refunds,
  reservations,
  webhookEvents,
} from '@/server/db/schema';
import { SESSION_COOKIE_NAME } from '@/server/auth/session';
import { registerAccount } from '@/server/services/auth.service';
import { createOrganisation } from '@/server/services/organisation.service';
import { createService } from '@/server/services/catalogue.service';
import { createAvailabilitySlot } from '@/server/services/availability.service';
import {
  createReservationHold,
  HOLD_TTL_SECONDS,
} from '@/server/services/reservation.service';
import {
  createBookingFromReservation,
  transitionBookingState,
} from '@/server/services/booking.service';
import { postBookingPaymentLedger } from '@/server/services/ledger.service';
import { MockPaymentProvider } from '@/server/payments/mock-provider';
import { POST as reservationsPost } from '@/app/api/reservations/route';
import { POST as bookingsPost } from '@/app/api/v1/bookings/route';
import { POST as refundsPost } from '@/app/api/v1/refunds/route';
import { POST as webhookPost } from '@/app/api/webhooks/payments/route';
import { startWorker } from '@/workers/index';
import { createRedisConnection, createValueousQueue } from '@/workers/queues';
import { truncateAllTables } from '../setup';

function authedPost(path: string, cookieValue: string, body: unknown, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      cookie: `${SESSION_COOKIE_NAME}=${cookieValue}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function assertGlobalLedgerBalanced() {
  const db = getDb();
  const entries = await db.select().from(ledgerEntries);
  const debits = entries.filter((e) => e.direction === 'D').reduce((sum, e) => sum + e.amountPaise, 0);
  const credits = entries.filter((e) => e.direction === 'C').reduce((sum, e) => sum + e.amountPaise, 0);
  expect(debits).toBe(credits);
  return { debits, credits, count: entries.length };
}

describe('Integration (VLS-211): Blueprint Ch. 20 Critical Scenarios 1–7 on PG17 + Redis 7', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  async function seedBookableSlot(capacity = 1) {
    const owner = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Critical Test Studio',
      handleOrSlug: 'crit-test-studio',
      email: 'owner.crit@test.local',
      password: 'Password123!',
    });
    const cust1 = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Customer Alpha',
      email: 'alpha.crit@test.local',
      password: 'Password123!',
    });
    const cust2 = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Customer Beta',
      email: 'beta.crit@test.local',
      password: 'Password123!',
    });

    const org = await createOrganisation(owner.user.id, {
      legalName: 'Critical Wellness Pvt Ltd',
      tradeName: 'Critical Wellness',
    });
    const service = await createService(owner.user.id, org.id, {
      title: 'Therapeutic Spa Ritual',
      description: '60-minute holistic spa session with verified inclusions.',
      durationMin: 60,
      basePricePaise: 200_000,
    });
    const slot = await createAvailabilitySlot(owner.user.id, {
      itemType: 'service',
      itemId: service.id,
      startsAt: '2026-12-28T10:00:00.000Z',
      endsAt: '2026-12-28T11:00:00.000Z',
      capacity,
    });

    return { owner, cust1, cust2, org, service, slot };
  }

  it('Scenario 1: Two customers reserve the final slot simultaneously -> 1 hold + 1 409 SLOT_UNAVAILABLE', async () => {
    const { cust1, cust2, slot } = await seedBookableSlot(1);

    const [res1, res2] = await Promise.all([
      reservationsPost(
        authedPost(
          '/api/reservations',
          cust1.session.cookieValue,
          { slotId: slot.id, quantity: 1 },
          { 'idempotency-key': 'scen1-idem-key-cust1' }
        )
      ),
      reservationsPost(
        authedPost(
          '/api/reservations',
          cust2.session.cookieValue,
          { slotId: slot.id, quantity: 1 },
          { 'idempotency-key': 'scen1-idem-key-cust2' }
        )
      ),
    ]);

    const statuses = [res1.status, res2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);

    const loser = res1.status === 409 ? res1 : res2;
    const loserJson = (await loser.json()) as { error: { code: string } };
    expect(loserJson.error.code).toBe('SLOT_UNAVAILABLE');

    const winner = res1.status === 201 ? res1 : res2;
    const winnerJson = (await winner.json()) as {
      reservation_id: string;
      status: string;
      seconds_remaining: number;
    };
    expect(winnerJson.status).toBe('held');
    expect(winnerJson.seconds_remaining).toBeGreaterThan(250);
    expect(winnerJson.seconds_remaining).toBeLessThanOrEqual(HOLD_TTL_SECONDS);

    // Winner idempotency replay returns 200 without consuming extra capacity
    const winnerCookie =
      res1.status === 201 ? cust1.session.cookieValue : cust2.session.cookieValue;
    const winnerKey = res1.status === 201 ? 'scen1-idem-key-cust1' : 'scen1-idem-key-cust2';
    const replayRes = await reservationsPost(
      authedPost(
        '/api/reservations',
        winnerCookie,
        { slotId: slot.id, quantity: 1 },
        { 'idempotency-key': winnerKey }
      )
    );
    expect(replayRes.status).toBe(200);
    expect(((await replayRes.json()) as { replayed: boolean }).replayed).toBe(true);

    const db = getDb();
    const [slotRow] = await db.select().from(availability).where(eq(availability.id, slot.id));
    expect(slotRow!.reserved).toBe(1);
    expect(slotRow!.confirmed).toBe(0);
    expect(slotRow!.reserved + slotRow!.confirmed).toBeLessThanOrEqual(slotRow!.capacity);
  });

  it('Scenario 2 & Scenario 3: Late payment webhook confirms after verification & duplicate webhook is idempotent', async () => {
    const { cust1, org, slot } = await seedBookableSlot(2);
    const db = getDb();

    const hold = await createReservationHold(cust1.user.id, 'scen2-idem-hold-0001', {
      slotId: slot.id,
      quantity: 1,
    });
    const booking = await createBookingFromReservation(cust1.user.id, {
      reservationId: hold.reservation_id,
      organisationId: org.id,
      totalPaise: 180_000,
      policySnapshot: { refundPercent: 100 },
    });
    expect(booking.state).toBe('Pending Payment');

    const provider = new MockPaymentProvider();
    const intent = await provider.createPaymentIntent({
      bookingId: booking.id,
      amountPaise: 180_000,
      currency: 'INR',
      idempotencyKey: `pay_${booking.id}`,
    });

    await db.insert(payments).values({
      bookingId: booking.id,
      provider: provider.name,
      providerOrderId: intent.providerOrderId,
      amountPaise: 180_000,
      currency: 'INR',
      status: 'CREATED',
      idempotencyKey: `pay_${booking.id}`,
    });

    // Scenario 2: Late signed webhook arrives (occurred 6 minutes earlier)
    const lateSim = provider.buildSimulatedWebhook({
      scenario: 'late',
      orderId: intent.providerOrderId,
      eventId: 'evt_late_dup_001',
      amountPaise: 180_000,
    });

    const whRes1 = await webhookPost(
      new NextRequest('http://localhost:3000/api/webhooks/payments', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-provider-signature': lateSim.signatureHeader,
        },
        body: lateSim.rawBody,
      })
    );
    expect(whRes1.status).toBe(200);
    expect(await whRes1.json()).toEqual({ received: true, duplicate: false });

    // Verify provider status API + confirm booking + post balanced ledger once
    const providerStatus = await provider.getPaymentStatus(intent.providerOrderId);
    expect(providerStatus.status).toBe('CAPTURED');

    const [paymentRow] = await db
      .select()
      .from(payments)
      .where(eq(payments.providerOrderId, intent.providerOrderId));
    expect(paymentRow!.status).toBe('CAPTURED');

    const confirmed = await transitionBookingState({
      bookingId: booking.id,
      toState: 'Confirmed',
      actorUserId: cust1.user.id,
      reason: 'Provider status & signed late webhook verified',
    });
    expect(confirmed.state).toBe('Confirmed');

    await postBookingPaymentLedger({
      bookingId: booking.id,
      organisationId: org.id,
      eligibleNetPaise: 180_000,
    });

    // Scenario 3: Duplicate webhook delivery returns 200 duplicate:true with zero extra side effects
    const whRes2 = await webhookPost(
      new NextRequest('http://localhost:3000/api/webhooks/payments', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-provider-signature': lateSim.signatureHeader,
        },
        body: lateSim.rawBody,
      })
    );
    expect(whRes2.status).toBe(200);
    expect(await whRes2.json()).toEqual({ received: true, duplicate: true });

    const evtRows = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, 'evt_late_dup_001'));
    expect(evtRows).toHaveLength(1);

    const txRows = await db
      .select()
      .from(ledgerTransactions)
      .where(eq(ledgerTransactions.bookingId, booking.id));
    expect(txRows).toHaveLength(1);
    await assertGlobalLedgerBalanced();
  });

  it('Scenario 4: Payment fails after temporary reservation -> hold persists for safe retry, then confirms', async () => {
    const { cust1, org, slot } = await seedBookableSlot(1);
    const db = getDb();

    const hold = await createReservationHold(cust1.user.id, 'scen4-idem-hold-0001', {
      slotId: slot.id,
      quantity: 1,
    });
    const booking = await createBookingFromReservation(cust1.user.id, {
      reservationId: hold.reservation_id,
      organisationId: org.id,
      totalPaise: 200_000,
    });

    const provider = new MockPaymentProvider();
    const intent1 = await provider.createPaymentIntent({
      bookingId: booking.id,
      amountPaise: 200_000,
      currency: 'INR',
      idempotencyKey: `pay_fail_${booking.id}`,
    });
    await db.insert(payments).values({
      bookingId: booking.id,
      provider: provider.name,
      providerOrderId: intent1.providerOrderId,
      amountPaise: 200_000,
      currency: 'INR',
      status: 'CREATED',
      idempotencyKey: `pay_fail_${booking.id}`,
    });

    // Failed webhook keeps booking unconfirmed & reservation held
    const failSim = provider.buildSimulatedWebhook({
      scenario: 'fail',
      orderId: intent1.providerOrderId,
      amountPaise: 200_000,
    });
    const failRes = await webhookPost(
      new NextRequest('http://localhost:3000/api/webhooks/payments', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-provider-signature': failSim.signatureHeader,
        },
        body: failSim.rawBody,
      })
    );
    expect(failRes.status).toBe(200);

    const [bookingAfterFail] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    const [holdAfterFail] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, hold.reservation_id));
    const [slotAfterFail] = await db.select().from(availability).where(eq(availability.id, slot.id));
    expect(bookingAfterFail!.state).toBe('Pending Payment');
    expect(holdAfterFail!.status).toBe('held');
    expect(slotAfterFail!.reserved).toBe(1);

    // Safe retry with new payment intent succeeds
    const intent2 = await provider.createPaymentIntent({
      bookingId: booking.id,
      amountPaise: 200_000,
      currency: 'INR',
      idempotencyKey: `pay_retry_${booking.id}`,
    });
    await db.insert(payments).values({
      bookingId: booking.id,
      provider: provider.name,
      providerOrderId: intent2.providerOrderId,
      amountPaise: 200_000,
      currency: 'INR',
      status: 'CREATED',
      idempotencyKey: `pay_retry_${booking.id}`,
    });

    const okSim = provider.buildSimulatedWebhook({
      scenario: 'success',
      orderId: intent2.providerOrderId,
      amountPaise: 200_000,
    });
    await webhookPost(
      new NextRequest('http://localhost:3000/api/webhooks/payments', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-provider-signature': okSim.signatureHeader,
        },
        body: okSim.rawBody,
      })
    );

    const confirmed = await transitionBookingState({
      bookingId: booking.id,
      toState: 'Confirmed',
      actorUserId: cust1.user.id,
      reason: 'Retry payment succeeded',
    });
    expect(confirmed.state).toBe('Confirmed');
  });

  it('Scenario 5: Five-minute reservation expiry worker + lazy check release capacity on PG17 + Redis 7', async () => {
    const { cust1, cust2, org, slot } = await seedBookableSlot(1);
    const db = getDb();

    // 5a. BullMQ worker processes reservation-expiry job on Redis 7 & expireReservationHold releases slot
    const hold = await createReservationHold(cust1.user.id, 'scen5-idem-hold-0001', {
      slotId: slot.id,
      quantity: 1,
    });

    const worker = startWorker();
    const redisConn = createRedisConnection();
    const queue = createValueousQueue(redisConn);

    const jobProcessed = new Promise<string>((resolve, reject) => {
      worker.on('completed', (job) => {
        if (job.data.kind === 'reservation-expiry' && job.data.reservationId === hold.reservation_id) {
          resolve(job.data.reservationId);
        }
      });
      worker.on('failed', (_job, err) => reject(err));
    });

    await queue.add(
      'reservation-expiry',
      { kind: 'reservation-expiry', reservationId: hold.reservation_id },
      { delay: 50, jobId: `scen5_${hold.reservation_id}` }
    );
    const completedResId = await jobProcessed;
    expect(completedResId).toBe(hold.reservation_id);

    const [holdAfterWorker] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, hold.reservation_id));
    expect(holdAfterWorker!.status).toBe('expired');

    const [slotAfterWorker] = await db.select().from(availability).where(eq(availability.id, slot.id));
    expect(slotAfterWorker!.reserved).toBe(0);

    await queue.close();
    await redisConn.quit();
    await worker.close();

    // 5b. Lazy expiry check on expired TTL blocks checkout (409 HOLD_EXPIRED) and allows next customer
    const hold2 = await createReservationHold(cust1.user.id, 'scen5-idem-hold-0002', {
      slotId: slot.id,
      quantity: 1,
    });
    await db
      .update(reservations)
      .set({ expiresAt: new Date(Date.now() - 10_000).toISOString() })
      .where(eq(reservations.id, hold2.reservation_id));

    const expiredCheckoutRes = await bookingsPost(
      authedPost('/api/v1/bookings', cust1.session.cookieValue, {
        reservationId: hold2.reservation_id,
        organisationId: org.id,
        totalPaise: 200_000,
      })
    );
    expect(expiredCheckoutRes.status).toBe(409);
    expect(((await expiredCheckoutRes.json()) as { error: { code: string } }).error.code).toBe(
      'HOLD_EXPIRED'
    );

    // Freed slot can now be reserved by Customer 2
    const holdCust2 = await createReservationHold(cust2.user.id, 'scen5-idem-hold-cust2', {
      slotId: slot.id,
      quantity: 1,
    });
    expect(holdCust2.status).toBe('held');
  });

  it('Scenario 6 & Scenario 7: Provider cancellation refund + customer policy-computed partial refund keep ledger balanced', async () => {
    const { owner, cust1, cust2, org, slot } = await seedBookableSlot(2);
    const db = getDb();

    // Booking A: Full refund (100% policy) initiated when provider cancels Confirmed booking
    const holdA = await createReservationHold(cust1.user.id, 'scen6-idem-hold-a', {
      slotId: slot.id,
      quantity: 1,
    });
    const bookingA = await createBookingFromReservation(cust1.user.id, {
      reservationId: holdA.reservation_id,
      organisationId: org.id,
      totalPaise: 200_000,
      policySnapshot: { refundPercent: 100 },
    });
    await transitionBookingState({
      bookingId: bookingA.id,
      toState: 'Confirmed',
      actorUserId: cust1.user.id,
      reason: 'Payment captured',
    });
    await postBookingPaymentLedger({
      bookingId: bookingA.id,
      organisationId: org.id,
      eligibleNetPaise: 200_000,
    });

    const providerCancelRes = await refundsPost(
      authedPost('/api/v1/refunds', owner.session.cookieValue, {
        bookingId: bookingA.id,
        reason: 'Provider cancelled confirmed booking due to maintenance',
      })
    );
    expect(providerCancelRes.status).toBe(201);
    const cancelJson = (await providerCancelRes.json()) as {
      refund: { amountPaise: number; status: string };
    };
    expect(cancelJson.refund.amountPaise).toBe(200_000);
    expect(cancelJson.refund.status).toBe('REFUNDED');

    const [bookingAAfter] = await db.select().from(bookings).where(eq(bookings.id, bookingA.id));
    expect(bookingAAfter!.state).toBe('Refunded');

    const eventsA = await db
      .select()
      .from(bookingEvents)
      .where(eq(bookingEvents.bookingId, bookingA.id));
    expect(eventsA.map((e) => e.toState)).toEqual(
      expect.arrayContaining(['Pending Payment', 'Confirmed', 'Cancelled', 'Refund Pending', 'Refunded'])
    );

    const [slotAfterCancel] = await db.select().from(availability).where(eq(availability.id, slot.id));
    expect(slotAfterCancel!.confirmed).toBe(0);

    // Scenario 7: Customer requests refund under 50% partial-refund policy
    const holdB = await createReservationHold(cust2.user.id, 'scen7-idem-hold-b', {
      slotId: slot.id,
      quantity: 1,
    });
    const bookingB = await createBookingFromReservation(cust2.user.id, {
      reservationId: holdB.reservation_id,
      organisationId: org.id,
      totalPaise: 150_000,
      policySnapshot: { refundPercent: 50 },
    });
    await transitionBookingState({
      bookingId: bookingB.id,
      toState: 'Confirmed',
      actorUserId: cust2.user.id,
      reason: 'Payment captured',
    });
    await postBookingPaymentLedger({
      bookingId: bookingB.id,
      organisationId: org.id,
      eligibleNetPaise: 150_000,
    });

    const custRefundRes = await refundsPost(
      authedPost('/api/v1/refunds', cust2.session.cookieValue, {
        bookingId: bookingB.id,
        reason: 'Customer requested partial refund per policy',
      })
    );
    expect(custRefundRes.status).toBe(201);
    const refundBJson = (await custRefundRes.json()) as {
      refund: { amountPaise: number; status: string };
    };
    expect(refundBJson.refund.amountPaise).toBe(75_000);
    expect(refundBJson.refund.status).toBe('REFUNDED');

    const refundRows = await db.select().from(refunds);
    expect(refundRows).toHaveLength(2);

    // Every transaction & global ledger remains strictly balanced
    await assertGlobalLedgerBalanced();
  });
});
