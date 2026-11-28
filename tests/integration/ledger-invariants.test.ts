import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { users } from '@/server/db/schema';
import { SESSION_COOKIE_NAME } from '@/server/auth/session';
import { hashPassword } from '@/server/lib/crypto';
import { loginUser, registerAccount } from '@/server/services/auth.service';
import { createOrganisation } from '@/server/services/organisation.service';
import { createService } from '@/server/services/catalogue.service';
import { createAvailabilitySlot } from '@/server/services/availability.service';
import { createReservationHold } from '@/server/services/reservation.service';
import {
  createBookingFromReservation,
  transitionBookingState,
} from '@/server/services/booking.service';
import {
  calculateCommissionSplit,
  postBalancedLedgerTransaction,
  postBookingPaymentLedger,
  reverseBookingLedger,
} from '@/server/services/ledger.service';
import { requestAndProcessBookingRefund } from '@/server/services/refund.service';
import { GET as financeLedgerGet } from '@/app/api/v1/finance/ledger/route';
import {
  GET as financeReconGet,
  POST as financeReconPost,
} from '@/app/api/v1/finance/reconciliation/route';
import { truncateAllTables } from '../setup';

async function expectInsertOnlyRejection(promise: Promise<unknown>) {
  try {
    await promise;
    throw new Error('Expected PostgreSQL insert-only trigger to reject mutation');
  } catch (err) {
    const e = err as { message?: string; cause?: { message?: string } };
    const fullMsg = `${e.message ?? ''} ${e.cause?.message ?? ''}`;
    expect(fullMsg).toMatch(/insert-only/i);
  }
}

describe('Integration (VLS-212): Double-Entry Ledger Invariants, DB Immutability & Reconciliation', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  async function seedBookingContext() {
    const db = getDb();
    const owner = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Ledger Studio Owner',
      handleOrSlug: 'ledger-studio',
      email: 'owner.ledger@test.local',
      password: 'Password123!',
    });
    const customer = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Ledger Customer',
      email: 'cust.ledger@test.local',
      password: 'Password123!',
    });
    const creator = await registerAccount({
      role: 'INFLUENCER',
      displayName: 'Ledger Creator',
      handleOrSlug: 'ledger-creator',
      email: 'creator.ledger@test.local',
      password: 'Password123!',
    });

    await db.insert(users).values({
      email: 'finance.admin@test.local',
      passwordHash: await hashPassword('AdminPass123!'),
      displayName: 'Finance Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    const admin = await loginUser({
      email: 'finance.admin@test.local',
      password: 'AdminPass123!',
    });

    const org = await createOrganisation(owner.user.id, {
      legalName: 'Ledger Wellness Pvt Ltd',
      tradeName: 'Ledger Wellness',
    });
    const service = await createService(owner.user.id, org.id, {
      title: 'Signature Wellness Session',
      description: '60-minute wellness session used for ledger verification.',
      durationMin: 60,
      basePricePaise: 180_000,
    });
    const slot = await createAvailabilitySlot(owner.user.id, {
      itemType: 'service',
      itemId: service.id,
      startsAt: '2026-12-29T10:00:00.000Z',
      endsAt: '2026-12-29T11:00:00.000Z',
      capacity: 10,
    });

    return { owner, customer, creator, admin, org, service, slot };
  }

  it('validates Blueprint Ch. 9 integer-paise commission splits and rejects imbalanced or fractional ledger posts', async () => {
    // Blueprint Ch. 9 worked example: Rs 1,800 net -> Rs 180 commission -> Rs 72 creator (40%) + Rs 108 platform (60%)
    const split = calculateCommissionSplit(180_000, 1000, 4000);
    expect(split).toEqual({
      eligibleNetPaise: 180_000,
      totalCommissionPaise: 18_000,
      creatorPaise: 7_200,
      platformPaise: 10_800,
      businessNetPaise: 162_000,
    });
    expect(split.creatorPaise + split.platformPaise).toBe(split.totalCommissionPaise);
    expect(split.businessNetPaise + split.totalCommissionPaise).toBe(split.eligibleNetPaise);

    // Reject single-entry transaction
    await expect(
      postBalancedLedgerTransaction({
        kind: 'SINGLE_ENTRY',
        entries: [
          {
            accountCode: 'PAYMENT_CLEARING',
            accountType: 'ASSET',
            ownerType: 'PLATFORM',
            ownerId: 'platform',
            direction: 'D',
            amountPaise: 10_000,
          },
        ],
      })
    ).rejects.toMatchObject({ status: 400, code: 'LEDGER_IMBALANCE' });

    // Reject floating-point / non-positive amounts
    await expect(
      postBalancedLedgerTransaction({
        kind: 'FLOAT_ENTRY',
        entries: [
          {
            accountCode: 'PAYMENT_CLEARING',
            accountType: 'ASSET',
            ownerType: 'PLATFORM',
            ownerId: 'platform',
            direction: 'D',
            amountPaise: 100.5,
          },
          {
            accountCode: 'BUSINESS_PAYABLE',
            accountType: 'LIABILITY',
            ownerType: 'PLATFORM',
            ownerId: 'platform',
            direction: 'C',
            amountPaise: 100.5,
          },
        ],
      })
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });

    // Reject SUM(Debits) != SUM(Credits)
    await expect(
      postBalancedLedgerTransaction({
        kind: 'UNBALANCED',
        entries: [
          {
            accountCode: 'PAYMENT_CLEARING',
            accountType: 'ASSET',
            ownerType: 'PLATFORM',
            ownerId: 'platform',
            direction: 'D',
            amountPaise: 50_000,
          },
          {
            accountCode: 'BUSINESS_PAYABLE',
            accountType: 'LIABILITY',
            ownerType: 'PLATFORM',
            ownerId: 'platform',
            direction: 'C',
            amountPaise: 49_999,
          },
        ],
      })
    ).rejects.toMatchObject({ status: 400, code: 'LEDGER_IMBALANCE' });
  });

  it('enforces PostgreSQL trigger immutability (UPDATE/DELETE denied) across ledger_transactions, ledger_entries, and booking_events', async () => {
    const { customer, creator, org, slot } = await seedBookingContext();
    const db = getDb();

    const hold = await createReservationHold(customer.user.id, 'ledger-immut-hold-1', {
      slotId: slot.id,
      quantity: 1,
    });
    const booking = await createBookingFromReservation(customer.user.id, {
      reservationId: hold.reservation_id,
      organisationId: org.id,
      totalPaise: 212_400,
      policySnapshot: { refundPercent: 100 },
    });
    await transitionBookingState({
      bookingId: booking.id,
      toState: 'Confirmed',
      actorUserId: customer.user.id,
      reason: 'Payment captured',
    });

    const { ledgerResult } = await postBookingPaymentLedger({
      bookingId: booking.id,
      organisationId: org.id,
      creatorId: creator.user.id,
      eligibleNetPaise: 180_000,
      taxPaise: 32_400,
    });

    const txId = ledgerResult.transaction.id;
    const entryId = ledgerResult.entries[0]!.id;

    // DB triggers prevent UPDATE and DELETE on ledger_transactions, ledger_entries, and booking_events
    await expectInsertOnlyRejection(
      db.execute(sql`UPDATE ledger_transactions SET kind = 'TAMPERED' WHERE id = ${txId}`)
    );
    await expectInsertOnlyRejection(
      db.execute(sql`DELETE FROM ledger_transactions WHERE id = ${txId}`)
    );
    await expectInsertOnlyRejection(
      db.execute(sql`UPDATE ledger_entries SET amount_paise = 1 WHERE id = ${entryId}`)
    );
    await expectInsertOnlyRejection(
      db.execute(sql`DELETE FROM ledger_entries WHERE id = ${entryId}`)
    );
    await expectInsertOnlyRejection(
      db.execute(sql`UPDATE booking_events SET to_state = 'Closed' WHERE booking_id = ${booking.id}`)
    );
    await expectInsertOnlyRejection(
      db.execute(sql`DELETE FROM booking_events WHERE booking_id = ${booking.id}`)
    );

    // Corrections/reversals happen solely via append-only reversal transactions referencing original
    const reversal = await reverseBookingLedger({
      bookingId: booking.id,
      organisationId: org.id,
      refundPaise: 212_400,
      reversalOfTxId: txId,
    });
    expect(reversal.transaction.reversalOfId).toBe(txId);
  });

  it('maintains SUM(Debits) == SUM(Credits) per transaction after multiple bookings/refunds and reconciles via Finance API', async () => {
    const { customer, creator, admin, org, slot } = await seedBookingContext();
    const db = getDb();

    // Booking 1: Creator-attributed + GST, remains Confirmed
    const hold1 = await createReservationHold(customer.user.id, 'ledger-audit-hold-1', {
      slotId: slot.id,
      quantity: 1,
    });
    const b1 = await createBookingFromReservation(customer.user.id, {
      reservationId: hold1.reservation_id,
      organisationId: org.id,
      totalPaise: 212_400,
      policySnapshot: { refundPercent: 100 },
    });
    await transitionBookingState({
      bookingId: b1.id,
      toState: 'Confirmed',
      actorUserId: customer.user.id,
    });
    await postBookingPaymentLedger({
      bookingId: b1.id,
      organisationId: org.id,
      creatorId: creator.user.id,
      eligibleNetPaise: 180_000,
      taxPaise: 32_400,
    });

    // Booking 2: Partial 50% refund after confirmation
    const hold2 = await createReservationHold(customer.user.id, 'ledger-audit-hold-2', {
      slotId: slot.id,
      quantity: 1,
    });
    const b2 = await createBookingFromReservation(customer.user.id, {
      reservationId: hold2.reservation_id,
      organisationId: org.id,
      totalPaise: 100_000,
      policySnapshot: { refundPercent: 50 },
    });
    await transitionBookingState({
      bookingId: b2.id,
      toState: 'Confirmed',
      actorUserId: customer.user.id,
    });
    await postBookingPaymentLedger({
      bookingId: b2.id,
      organisationId: org.id,
      eligibleNetPaise: 100_000,
    });
    await requestAndProcessBookingRefund({
      bookingId: b2.id,
      actorUserId: customer.user.id,
      reason: '50% policy refund check',
    });

    // SQL-level invariant check: every single ledger_transactions row has SUM(D) === SUM(C)
    const perTxBalances = await db.execute(sql`
      SELECT
        transaction_id,
        COALESCE(SUM(CASE WHEN direction = 'D' THEN amount_paise ELSE 0 END), 0)::bigint AS debit_sum,
        COALESCE(SUM(CASE WHEN direction = 'C' THEN amount_paise ELSE 0 END), 0)::bigint AS credit_sum
      FROM ledger_entries
      GROUP BY transaction_id
    `);
    expect(perTxBalances.length).toBe(3); // b1 capture, b2 capture, b2 refund reversal
    for (const row of Array.from(perTxBalances) as Array<{ debit_sum: string; credit_sum: string }>) {
      expect(BigInt(row.debit_sum)).toBe(BigInt(row.credit_sum));
      expect(BigInt(row.debit_sum)).toBeGreaterThan(0n);
    }

    // Finance API: reconciliation classifies MATCHED, VARIANCE, and MISSING accurately
    const reconPostRes = await financeReconPost(
      new NextRequest('http://localhost:3000/api/v1/finance/reconciliation', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${SESSION_COOKIE_NAME}=${admin.session.cookieValue}`,
        },
        body: JSON.stringify({
          source: 'daily-mock-settlement',
          items: [
            { reference: b1.id, amountPaise: 212_400 },
            { reference: b2.id, amountPaise: 99_500 },
            { reference: 'unmatched-provider-ref-999', amountPaise: 45_000 },
          ],
        }),
      })
    );
    expect(reconPostRes.status).toBe(201);
    const reconPostJson = (await reconPostRes.json()) as {
      results: Array<{ status: string; variancePaise: number }>;
    };
    expect(reconPostJson.results.map((r) => r.status)).toEqual(['MATCHED', 'VARIANCE', 'MISSING']);
    expect(reconPostJson.results[1]!.variancePaise).toBe(-500);

    const ledgerGetRes = await financeLedgerGet(
      new NextRequest('http://localhost:3000/api/v1/finance/ledger', {
        headers: {
          host: 'localhost:3000',
          cookie: `${SESSION_COOKIE_NAME}=${admin.session.cookieValue}`,
        },
      })
    );
    expect(ledgerGetRes.status).toBe(200);

    const reconGetRes = await financeReconGet(
      new NextRequest('http://localhost:3000/api/v1/finance/reconciliation', {
        headers: {
          host: 'localhost:3000',
          cookie: `${SESSION_COOKIE_NAME}=${admin.session.cookieValue}`,
        },
      })
    );
    expect(reconGetRes.status).toBe(200);
  });
});
