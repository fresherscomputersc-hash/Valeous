import { and, asc, eq, gt, gte, lt, lte } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import { availability } from '@/server/db/schema';
import { recordAuditLog } from '@/server/audit/audit.service';

const createSlotSchema = z.object({
  itemType: z.enum(['service', 'event']),
  itemId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  capacity: z.coerce.number().int().min(1).max(100_000),
});

export async function createAvailabilitySlot(actorUserId: string, rawInput: unknown) {
  const parsed = createSlotSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid availability slot.',
      400
    );
  }

  const d = parsed.data;
  if (new Date(d.endsAt).getTime() <= new Date(d.startsAt).getTime()) {
    throw new AppError('VALIDATION_ERROR', 'Slot endsAt must be after startsAt.', 400);
  }

  const db = getDb();
  const created = await db.transaction(async (tx) => {
    const overlapping = await tx
      .select({ id: availability.id })
      .from(availability)
      .where(
        and(
          eq(availability.itemType, d.itemType),
          eq(availability.itemId, d.itemId),
          lt(availability.startsAt, d.endsAt),
          gt(availability.endsAt, d.startsAt)
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      throw new AppError(
        'OVERLAPPING_SLOT',
        'An overlapping availability slot already exists for this item.',
        409
      );
    }

    const [slot] = await tx
      .insert(availability)
      .values({
        itemType: d.itemType,
        itemId: d.itemId,
        startsAt: d.startsAt,
        endsAt: d.endsAt,
        capacity: d.capacity,
        reserved: 0,
        confirmed: 0,
        version: 1,
      })
      .returning();

    await recordAuditLog(
      {
        actorUserId,
        action: 'AVAILABILITY_SLOT_CREATED',
        targetType: 'AVAILABILITY',
        targetId: slot!.id,
        metadata: { itemType: d.itemType, itemId: d.itemId, capacity: d.capacity },
      },
      tx
    );

    return slot!;
  });

  return created;
}

export async function listAvailabilitySlots(params: {
  itemType: 'service' | 'event';
  itemId: string;
  fromIso?: string;
  toIso?: string;
}) {
  const db = getDb();
  const conditions = [
    eq(availability.itemType, params.itemType),
    eq(availability.itemId, params.itemId),
  ];

  if (params.fromIso) {
    conditions.push(gte(availability.startsAt, params.fromIso));
  }
  if (params.toIso) {
    conditions.push(lte(availability.endsAt, params.toIso));
  }

  return db
    .select()
    .from(availability)
    .where(and(...conditions))
    .orderBy(asc(availability.startsAt));
}
