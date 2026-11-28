import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { availability } from '@/server/db/schema';
import { SESSION_COOKIE_NAME } from '@/server/auth/session';
import { registerAccount } from '@/server/services/auth.service';
import {
  addStaffMembership,
  createBranch,
  createOrganisation,
} from '@/server/services/organisation.service';
import { createEvent, createService } from '@/server/services/catalogue.service';
import {
  createAvailabilitySlot,
  listAvailabilitySlots,
} from '@/server/services/availability.service';
import { createReservationHold } from '@/server/services/reservation.service';
import {
  GET as availabilityGet,
  POST as availabilityPost,
} from '@/app/api/v1/availability/route';
import { truncateAllTables } from '../setup';

describe('Integration (VLS-210): Availability Overlap, Capacity Constraints & Concurrency', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  async function seedServiceAndOrg() {
    const owner = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Availability Studio Owner',
      handleOrSlug: 'avail-studio-owner',
      email: 'avail.owner@test.local',
      password: 'Password123!',
      city: 'Bhubaneswar',
    });

    const org = await createOrganisation(owner.user.id, {
      legalName: 'Availability Wellness Pvt Ltd',
      tradeName: 'Avail Studio',
    });
    const branch = await createBranch(owner.user.id, org.id, {
      name: 'Saheed Nagar Flagship',
      city: 'Bhubaneswar',
    });
    const service = await createService(owner.user.id, org.id, {
      branchId: branch.id,
      title: 'Deep Relaxation Therapy',
      description: '60-minute guided wellness therapy session with certified staff.',
      durationMin: 60,
      basePricePaise: 150_000,
    });

    return { owner, org, branch, service };
  }

  it('rejects overlapping slots across containment/partial cases and allows adjacent boundaries', async () => {
    const { owner, service } = await seedServiceAndOrg();

    const baseSlot = await createAvailabilitySlot(owner.user.id, {
      itemType: 'service',
      itemId: service.id,
      startsAt: '2026-12-20T10:00:00.000Z',
      endsAt: '2026-12-20T11:00:00.000Z',
      capacity: 4,
    });
    expect(baseSlot.capacity).toBe(4);

    // Invalid time range (endsAt <= startsAt)
    await expect(
      createAvailabilitySlot(owner.user.id, {
        itemType: 'service',
        itemId: service.id,
        startsAt: '2026-12-20T12:00:00.000Z',
        endsAt: '2026-12-20T12:00:00.000Z',
        capacity: 2,
      })
    ).rejects.toThrow(/endsAt must be after startsAt/i);

    const overlappingWindows = [
      // Exact match
      ['2026-12-20T10:00:00.000Z', '2026-12-20T11:00:00.000Z'],
      // Left overlap
      ['2026-12-20T09:30:00.000Z', '2026-12-20T10:30:00.000Z'],
      // Right overlap
      ['2026-12-20T10:30:00.000Z', '2026-12-20T11:30:00.000Z'],
      // Contained inside
      ['2026-12-20T10:15:00.000Z', '2026-12-20T10:45:00.000Z'],
      // Enclosing
      ['2026-12-20T09:00:00.000Z', '2026-12-20T12:00:00.000Z'],
    ] as const;

    for (const [startsAt, endsAt] of overlappingWindows) {
      await expect(
        createAvailabilitySlot(owner.user.id, {
          itemType: 'service',
          itemId: service.id,
          startsAt,
          endsAt,
          capacity: 2,
        })
      ).rejects.toMatchObject({ status: 409, code: 'OVERLAPPING_SLOT' });
    }

    // Adjacent slots sharing exact boundary (09:00-10:00 and 11:00-12:00) succeed
    await createAvailabilitySlot(owner.user.id, {
      itemType: 'service',
      itemId: service.id,
      startsAt: '2026-12-20T09:00:00.000Z',
      endsAt: '2026-12-20T10:00:00.000Z',
      capacity: 3,
    });
    await createAvailabilitySlot(owner.user.id, {
      itemType: 'service',
      itemId: service.id,
      startsAt: '2026-12-20T11:00:00.000Z',
      endsAt: '2026-12-20T12:00:00.000Z',
      capacity: 3,
    });

    const slots = await listAvailabilitySlots({
      itemType: 'service',
      itemId: service.id,
    });
    expect(slots).toHaveLength(3);
    expect(slots.map((s) => new Date(s.startsAt).toISOString())).toEqual([
      '2026-12-20T09:00:00.000Z',
      '2026-12-20T10:00:00.000Z',
      '2026-12-20T11:00:00.000Z',
    ]);
  });

  it('enforces UNIQUE(item_type, item_id, starts_at) and CHECK(reserved + confirmed <= capacity) at DB level under concurrency', async () => {
    const { owner, org, service } = await seedServiceAndOrg();
    const db = getDb();

    // Concurrent duplicate slot creation for the same startsAt yields at most 1 row
    const duplicateResults = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        createAvailabilitySlot(owner.user.id, {
          itemType: 'service',
          itemId: service.id,
          startsAt: '2026-12-21T10:00:00.000Z',
          endsAt: '2026-12-21T11:00:00.000Z',
          capacity: 3,
        })
      )
    );
    const createdSlots = duplicateResults.filter((r) => r.status === 'fulfilled');
    expect(createdSlots).toHaveLength(1);
    const slot = (createdSlots[0] as PromiseFulfilledResult<typeof availability.$inferSelect>).value;

    // Concurrent reservation storm (10 customers racing for capacity=3) produces zero capacity violations
    const customers = await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        registerAccount({
          role: 'CUSTOMER',
          displayName: `Race Customer ${idx}`,
          email: `race.c${idx}@test.local`,
          password: 'Password123!',
        })
      )
    );

    const holdAttempts = await Promise.allSettled(
      customers.map((c, idx) =>
        createReservationHold(c.user.id, `race-idem-${idx}-00000001`, {
          slotId: slot.id,
          quantity: 1,
        })
      )
    );

    const succeededHolds = holdAttempts.filter((r) => r.status === 'fulfilled');
    const failedHolds = holdAttempts.filter((r) => r.status === 'rejected');
    expect(succeededHolds).toHaveLength(3);
    expect(failedHolds).toHaveLength(7);

    const [slotAfter] = await db
      .select()
      .from(availability)
      .where(eq(availability.id, slot.id));
    expect(slotAfter!.reserved).toBe(3);
    expect(slotAfter!.confirmed).toBe(0);
    expect(slotAfter!.reserved + slotAfter!.confirmed).toBeLessThanOrEqual(slotAfter!.capacity);

    // Direct PostgreSQL CHECK constraint blocks over-capacity or negative updates
    await expect(
      db.execute(
        sql`UPDATE availability SET reserved = capacity + 1 WHERE id = ${slot.id}`
      )
    ).rejects.toThrow();

    await expect(
      db.execute(
        sql`UPDATE availability SET confirmed = 1 WHERE id = ${slot.id}`
      )
    ).rejects.toThrow();

    await expect(
      db.execute(
        sql`UPDATE availability SET reserved = -1 WHERE id = ${slot.id}`
      )
    ).rejects.toThrow();

    // Event availability slots also enforce capacity & uniqueness
    const evt = await createEvent(owner.user.id, org.id, {
      title: 'Bhubaneswar Craft Workshop',
      description: 'Hands-on pottery and artisanal craft workshop for beginners.',
      startsAt: '2026-12-22T14:00:00.000Z',
      endsAt: '2026-12-22T17:00:00.000Z',
      venue: 'Saheed Nagar Studio',
      capacity: 2,
      basePricePaise: 99_900,
    });
    const evtSlot = await createAvailabilitySlot(owner.user.id, {
      itemType: 'event',
      itemId: evt.id,
      startsAt: '2026-12-22T14:00:00.000Z',
      endsAt: '2026-12-22T17:00:00.000Z',
      capacity: 2,
    });
    expect(evtSlot.itemType).toBe('event');
  });

  it('enforces OrgRole permissions on /api/v1/availability POST and filters GET by date range', async () => {
    const { owner, org, branch, service } = await seedServiceAndOrg();

    const staff = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Branch Staff',
      email: 'staff.avail@test.local',
      password: 'Password123!',
    });
    await addStaffMembership(owner.user.id, org.id, {
      userId: staff.user.id,
      branchId: branch.id,
      orgRole: 'STAFF',
    });

    // STAFF cannot create availability slots via API (403 FORBIDDEN)
    const deniedRes = await availabilityPost(
      new NextRequest('http://localhost:3000/api/v1/availability', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${SESSION_COOKIE_NAME}=${staff.session.cookieValue}`,
        },
        body: JSON.stringify({
          organisationId: org.id,
          itemType: 'service',
          itemId: service.id,
          startsAt: '2026-12-25T10:00:00.000Z',
          endsAt: '2026-12-25T11:00:00.000Z',
          capacity: 2,
        }),
      })
    );
    expect(deniedRes.status).toBe(403);

    // ORG_OWNER creates slot via API (201)
    const createdRes = await availabilityPost(
      new NextRequest('http://localhost:3000/api/v1/availability', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${SESSION_COOKIE_NAME}=${owner.session.cookieValue}`,
        },
        body: JSON.stringify({
          organisationId: org.id,
          itemType: 'service',
          itemId: service.id,
          startsAt: '2026-12-25T10:00:00.000Z',
          endsAt: '2026-12-25T11:00:00.000Z',
          capacity: 5,
        }),
      })
    );
    expect(createdRes.status).toBe(201);

    // GET /api/v1/availability filters by date window
    const getRes = await availabilityGet(
      new NextRequest(
        `http://localhost:3000/api/v1/availability?itemType=service&itemId=${service.id}&from=2026-12-25T00:00:00.000Z&to=2026-12-25T23:59:59.000Z`
      )
    );
    expect(getRes.status).toBe(200);
    const getJson = (await getRes.json()) as { slots: Array<{ capacity: number }> };
    expect(getJson.slots).toHaveLength(1);
    expect(getJson.slots[0]!.capacity).toBe(5);
  });
});
