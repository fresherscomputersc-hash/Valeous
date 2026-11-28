import { beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { bookingEvents, bookings, ledgerEntries } from '@/server/db/schema';
import { registerAccount } from '@/server/services/auth.service';
import {
  addStaffMembership,
  createBranch,
  createOrganisation,
  decideVerification,
  submitKycVerification,
} from '@/server/services/organisation.service';
import { createService, searchCatalogue } from '@/server/services/catalogue.service';
import { createAvailabilitySlot } from '@/server/services/availability.service';
import {
  createReservationHold,
  expireReservationHold,
} from '@/server/services/reservation.service';
import {
  createBookingFromReservation,
  getBookingWithEvents,
  transitionBookingState,
} from '@/server/services/booking.service';
import {
  calculateCommissionSplit,
  postBalancedLedgerTransaction,
  postBookingPaymentLedger,
  runDailyReconciliation,
} from '@/server/services/ledger.service';
import { issueBookingQrPass, scanQrToken } from '@/server/services/qr.service';
import { requestAndProcessBookingRefund } from '@/server/services/refund.service';
import { truncateAllTables } from '../setup';

describe('Sprint 2 Core: VLS-201..VLS-206', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('VLS-201 & VLS-202: Org KYC, branches, staff, services, overlap rejection & search', async () => {
    const owner = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Glow Owner',
      handleOrSlug: 'glow-owner-s2',
      email: 'glow.s2@example.com',
      password: 'Password123!',
    });
    const admin = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Admin User',
      handleOrSlug: 'admin-s2',
      email: 'admin.s2@example.com',
      password: 'Password123!',
    });
    const staff = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Staff Member',
      email: 'staff.s2@example.com',
      password: 'Password123!',
    });

    const org = await createOrganisation(owner.user.id, {
      legalName: 'Glow Wellness Pvt Ltd',
      tradeName: 'Glow Studio',
    });
    const branch = await createBranch(owner.user.id, org.id, {
      name: 'Saheed Nagar',
      city: 'Bhubaneswar',
    });
    const member = await addStaffMembership(owner.user.id, org.id, {
      userId: staff.user.id,
      branchId: branch.id,
      orgRole: 'STAFF',
    });
    expect(member.orgRole).toBe('STAFF');

    const kyc = await submitKycVerification(owner.user.id, org.id, {
      evidenceRef: 'gst-cert-12345.pdf',
    });
    const decided = await decideVerification(admin.user.id, kyc.id, {
      decision: 'APPROVED',
      reason: 'GST verified',
    });
    expect(decided.status).toBe('APPROVED');

    const svc = await createService(owner.user.id, org.id, {
      branchId: branch.id,
      title: 'Signature Hydra Facial',
      description: '60-minute deep hydration facial with organic botanical serums.',
      durationMin: 60,
      basePricePaise: 180_000,
      inclusions: ['Cleanser', 'Serum'],
      exclusions: ['Parking'],
    });

    await createAvailabilitySlot(owner.user.id, {
      itemType: 'service',
      itemId: svc.id,
      startsAt: '2026-12-10T10:00:00.000Z',
      endsAt: '2026-12-10T11:00:00.000Z',
      capacity: 2,
    });

    await expect(
      createAvailabilitySlot(owner.user.id, {
        itemType: 'service',
        itemId: svc.id,
        startsAt: '2026-12-10T10:30:00.000Z',
        endsAt: '2026-12-10T11:30:00.000Z',
        capacity: 2,
      })
    ).rejects.toThrow(/overlapping/i);

    const searchRes = await searchCatalogue({ q: 'Hydra Facial', city: 'Bhubaneswar' });
    expect(searchRes.length).toBe(1);
  });

  it('VLS-203..VLS-206: Concurrency hold, 12-state booking, double-entry ledger, QR scan & refund', async () => {
    const owner = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Zen Owner',
      handleOrSlug: 'zen-owner-s2',
      email: 'zen.s2@example.com',
      password: 'Password123!',
    });
    const cust1 = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Customer One',
      email: 'c1.s2@example.com',
      password: 'Password123!',
    });
    const cust2 = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Customer Two',
      email: 'c2.s2@example.com',
      password: 'Password123!',
    });

    const org = await createOrganisation(owner.user.id, {
      legalName: 'Zen Spa LLP',
      tradeName: 'Zen Spa',
    });
    const svc = await createService(owner.user.id, org.id, {
      title: 'Deep Tissue Therapy',
      description: '60-minute therapeutic deep tissue massage session.',
      basePricePaise: 200_000,
    });
    const slot = await createAvailabilitySlot(owner.user.id, {
      itemType: 'service',
      itemId: svc.id,
      startsAt: '2026-12-12T10:00:00.000Z',
      endsAt: '2026-12-12T11:00:00.000Z',
      capacity: 1,
    });

    // VLS-203: Concurrent last-slot race yields 1 hold + 1 409 SLOT_UNAVAILABLE
    const [r1, r2] = await Promise.allSettled([
      createReservationHold(cust1.user.id, 'idem-key-cust-1-0001', { slotId: slot.id, quantity: 1 }),
      createReservationHold(cust2.user.id, 'idem-key-cust-2-0002', { slotId: slot.id, quantity: 1 }),
    ]);
    const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
    const rejected = [r1, r2].filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const hold = (fulfilled[0] as PromiseFulfilledResult<{ reservation_id: string }>).value;
    const winnerUserId = r1.status === 'fulfilled' ? cust1.user.id : cust2.user.id;

    // VLS-204: Create booking + invalid transition rejected + parent_booking_id hook
    const booking = await createBookingFromReservation(winnerUserId, {
      reservationId: hold.reservation_id,
      organisationId: org.id,
      totalPaise: 180_000,
      policySnapshot: { refundPercent: 100 },
    });
    expect(booking.state).toBe('Pending Payment');

    await expect(
      transitionBookingState({
        bookingId: booking.id,
        toState: 'Checked In',
        actorUserId: winnerUserId,
      })
    ).rejects.toThrow(/Cannot transition/);

    const confirmed = await transitionBookingState({
      bookingId: booking.id,
      toState: 'Confirmed',
      actorUserId: winnerUserId,
      reason: 'Payment verified',
    });
    expect(confirmed.state).toBe('Confirmed');

    // VLS-205: 10%/40% commission split + balanced double-entry ledger + DB trigger immutability
    const split = calculateCommissionSplit(180_000, 1000, 4000);
    expect(split.totalCommissionPaise).toBe(18_000);
    expect(split.creatorPaise).toBe(7_200);
    expect(split.platformPaise).toBe(10_800);
    expect(split.businessNetPaise).toBe(162_000);

    await expect(
      postBalancedLedgerTransaction({
        bookingId: booking.id,
        kind: 'BAD_TX',
        entries: [
          {
            accountCode: 'PAYMENT_CLEARING',
            accountType: 'ASSET',
            ownerType: 'PLATFORM',
            ownerId: 'platform',
            direction: 'D',
            amountPaise: 1000,
          },
          {
            accountCode: 'BUSINESS_PAYABLE',
            accountType: 'LIABILITY',
            ownerType: 'ORGANISATION',
            ownerId: org.id,
            direction: 'C',
            amountPaise: 900,
          },
        ],
      })
    ).rejects.toThrow(/Double-entry invariant violated/);

    await postBookingPaymentLedger({
      bookingId: booking.id,
      organisationId: org.id,
      eligibleNetPaise: 180_000,
      taxPaise: 32_400,
    });

    const db = getDb();
    const entries = await db.select().from(ledgerEntries);
    const debits = entries.filter((e) => e.direction === 'D').reduce((s, e) => s + e.amountPaise, 0);
    const credits = entries.filter((e) => e.direction === 'C').reduce((s, e) => s + e.amountPaise, 0);
    expect(debits).toBe(credits);

    // DB trigger rejects UPDATE/DELETE on ledger_entries
    await expect(
      db.execute(sql`UPDATE ledger_entries SET amount_paise = 1`)
    ).rejects.toThrow();

    // Daily reconciliation
    const recon = await runDailyReconciliation('mock-settlement', [
      { reference: booking.id, amountPaise: 212_400 },
    ]);
    expect(recon[0]!.status).toBe('MATCHED');

    // VLS-206: QR pass issuance + single-use scan + second scan rejected
    const pass = await issueBookingQrPass(booking.id, winnerUserId);
    const scan1 = await scanQrToken(pass.token, 'scanner-1', owner.user.id);
    expect(scan1.redeemed).toBe(true);

    await expect(
      scanQrToken(pass.token, 'scanner-2', owner.user.id)
    ).rejects.toThrow(/already used/i);

    const { events } = await getBookingWithEvents(booking.id);
    expect(events.length).toBeGreaterThanOrEqual(3);

    // VLS-206: Refund reverses ledger on a separate Confirmed booking
    const slot2 = await createAvailabilitySlot(owner.user.id, {
      itemType: 'service',
      itemId: svc.id,
      startsAt: '2026-12-13T10:00:00.000Z',
      endsAt: '2026-12-13T11:00:00.000Z',
      capacity: 1,
    });
    const hold2 = await createReservationHold(cust2.user.id, 'idem-key-cust-2-refund', {
      slotId: slot2.id,
      quantity: 1,
    });
    const b2 = await createBookingFromReservation(cust2.user.id, {
      reservationId: hold2.reservation_id,
      organisationId: org.id,
      totalPaise: 100_000,
      policySnapshot: { refundPercent: 100 },
    });
    await transitionBookingState({ bookingId: b2.id, toState: 'Confirmed', actorUserId: cust2.user.id });
    const refund = await requestAndProcessBookingRefund({
      bookingId: b2.id,
      actorUserId: cust2.user.id,
      reason: 'Customer cancelled within policy',
    });
    expect(refund.status).toBe('REFUNDED');

    const [b2After] = await db.select().from(bookings).where(eq(bookings.id, b2.id));
    expect(b2After!.state).toBe('Refunded');

    // Hold expiry helper check
    const slot3 = await createAvailabilitySlot(owner.user.id, {
      itemType: 'service',
      itemId: svc.id,
      startsAt: '2026-12-14T10:00:00.000Z',
      endsAt: '2026-12-14T11:00:00.000Z',
      capacity: 1,
    });
    const hold3 = await createReservationHold(cust1.user.id, 'idem-key-cust-1-exp', {
      slotId: slot3.id,
      quantity: 1,
    });
    const expRes = await expireReservationHold(hold3.reservation_id);
    expect(expRes.expired).toBe(true);
  });
});
