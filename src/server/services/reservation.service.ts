import { and, eq, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import { availability, reservations } from '@/server/db/schema';
import { recordAuditLog } from '@/server/audit/audit.service';
import { createRedisConnection, createValueousQueue } from '@/workers/queues';

export const HOLD_TTL_SECONDS = 300;

const createReservationSchema = z.object({
  slotId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

export async function createReservationHold(
  userId: string,
  idempotencyKey: string,
  rawInput: unknown
) {
  if (!idempotencyKey || idempotencyKey.trim().length < 8) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Idempotency-Key header is required (min 8 chars).',
      400
    );
  }

  const parsed = createReservationSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid reservation request.',
      400
    );
  }

  const { slotId, quantity } = parsed.data;
  const db = getDb();

  // 1. Idempotent replay check
  const [existing] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing) {
    const secondsRemaining = Math.max(
      0,
      Math.floor((new Date(existing.expiresAt).getTime() - Date.now()) / 1000)
    );
    return {
      reservation_id: existing.id,
      status: existing.status,
      expires_at: existing.expiresAt,
      seconds_remaining: secondsRemaining,
      replayed: true,
    };
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const expiresAtIso = new Date(nowMs + HOLD_TTL_SECONDS * 1000).toISOString();

  // 2. Atomic row-level lock + lazy expired-hold cleanup + capacity check
  const created = await db.transaction(async (tx) => {
    const lockedRows = await tx.execute(
      sql`SELECT id, capacity, reserved, confirmed FROM availability WHERE id = ${slotId} FOR UPDATE`
    );
    const slotRow = lockedRows[0] as
      | { id: string; capacity: number; reserved: number; confirmed: number }
      | undefined;

    if (!slotRow) {
      throw new AppError('NOT_FOUND', 'Availability slot not found.', 404);
    }

    // Lazy release any expired holds on this slot
    const expiredHolds = await tx
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.availabilityId, slotId),
          eq(reservations.status, 'held'),
          lte(reservations.expiresAt, nowIso)
        )
      );

    let releasedQty = 0;
    for (const exp of expiredHolds) {
      await tx
        .update(reservations)
        .set({ status: 'expired' })
        .where(eq(reservations.id, exp.id));
      releasedQty += exp.quantity;
    }

    const effectiveReserved = Math.max(0, Number(slotRow.reserved) - releasedQty);
    const available = Number(slotRow.capacity) - (effectiveReserved + Number(slotRow.confirmed));

    if (available < quantity) {
      throw new AppError(
        'SLOT_UNAVAILABLE',
        'This slot was just taken. Please choose another time.',
        409
      );
    }

    await tx
      .update(availability)
      .set({
        reserved: effectiveReserved + quantity,
        version: sql`${availability.version} + 1`,
        updatedAt: nowIso,
      })
      .where(eq(availability.id, slotId));

    const [resRow] = await tx
      .insert(reservations)
      .values({
        availabilityId: slotId,
        userId,
        quantity,
        expiresAt: expiresAtIso,
        status: 'held',
        idempotencyKey,
      })
      .returning();

    await recordAuditLog(
      {
        actorUserId: userId,
        action: 'RESERVATION_HELD',
        targetType: 'RESERVATION',
        targetId: resRow!.id,
        metadata: { slotId, quantity, expiresAt: expiresAtIso },
      },
      tx
    );

    return resRow!;
  });

  // 3. Best-effort BullMQ delayed expiry enqueue (DB lazy expiry remains authoritative)
  enqueueReservationExpiry(created.id, HOLD_TTL_SECONDS * 1000).catch(() => {});

  return {
    reservation_id: created.id,
    status: created.status,
    expires_at: created.expiresAt,
    seconds_remaining: HOLD_TTL_SECONDS,
    replayed: false,
  };
}

export async function expireReservationHold(reservationId: string): Promise<{ expired: boolean }> {
  const db = getDb();
  const nowIso = new Date().toISOString();

  return db.transaction(async (tx) => {
    const rows = await tx.execute(
      sql`SELECT id, availability_id, quantity, status, expires_at FROM reservations WHERE id = ${reservationId} FOR UPDATE`
    );
    const row = rows[0] as
      | {
          id: string;
          availability_id: string;
          quantity: number;
          status: string;
          expires_at: string;
        }
      | undefined;

    if (!row || row.status !== 'held') {
      return { expired: false };
    }

    await tx
      .update(reservations)
      .set({ status: 'expired' })
      .where(eq(reservations.id, reservationId));

    await tx
      .update(availability)
      .set({
        reserved: sql`GREATEST(0, ${availability.reserved} - ${Number(row.quantity)})`,
        version: sql`${availability.version} + 1`,
        updatedAt: nowIso,
      })
      .where(eq(availability.id, row.availability_id));

    return { expired: true };
  });
}

async function enqueueReservationExpiry(reservationId: string, delayMs: number) {
  const connection = createRedisConnection();
  const queue = createValueousQueue(connection);
  try {
    await queue.add(
      'reservation-expiry',
      { kind: 'reservation-expiry', reservationId },
      { delay: delayMs, jobId: `exp_${reservationId}` }
    );
  } finally {
    await queue.close();
    await connection.quit();
  }
}
