import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import { branches, events, organisations, services } from '@/server/db/schema';
import { recordAuditLog } from '@/server/audit/audit.service';

const createServiceSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(2000),
  durationMin: z.coerce.number().int().min(5).max(1440).default(60),
  basePricePaise: z.coerce.number().int().positive(),
  inclusions: z.array(z.string().trim().min(1).max(200)).default([]),
  exclusions: z.array(z.string().trim().min(1).max(200)).default([]),
  policyId: z.string().uuid().optional().nullable(),
  requiresApproval: z.boolean().default(false),
});

const updateServiceSchema = createServiceSchema.partial().extend({
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
});

const createEventSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(2000),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  venue: z.string().trim().min(2).max(200),
  capacity: z.coerce.number().int().min(1).max(100_000),
  basePricePaise: z.coerce.number().int().positive(),
});

export async function createService(
  actorUserId: string,
  organisationId: string,
  rawInput: unknown
) {
  const parsed = createServiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid service details.',
      400
    );
  }

  const d = parsed.data;
  const db = getDb();
  const [svc] = await db
    .insert(services)
    .values({
      organisationId,
      branchId: d.branchId ?? null,
      categoryId: d.categoryId ?? null,
      title: d.title,
      description: d.description,
      durationMin: d.durationMin,
      basePricePaise: d.basePricePaise,
      currency: 'INR',
      inclusionsJson: JSON.stringify(d.inclusions),
      exclusionsJson: JSON.stringify(d.exclusions),
      policyId: d.policyId ?? null,
      status: 'ACTIVE',
      requiresApproval: d.requiresApproval,
    })
    .returning();

  await recordAuditLog({
    actorUserId,
    action: 'SERVICE_CREATED',
    targetType: 'SERVICE',
    targetId: svc!.id,
    metadata: { organisationId, basePricePaise: d.basePricePaise },
  });

  return svc!;
}

export async function updateService(
  actorUserId: string,
  serviceId: string,
  rawInput: unknown
) {
  const parsed = updateServiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid service update.',
      400
    );
  }

  const d = parsed.data;
  const db = getDb();
  const [updated] = await db
    .update(services)
    .set({
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.durationMin !== undefined ? { durationMin: d.durationMin } : {}),
      ...(d.basePricePaise !== undefined ? { basePricePaise: d.basePricePaise } : {}),
      ...(d.inclusions !== undefined ? { inclusionsJson: JSON.stringify(d.inclusions) } : {}),
      ...(d.exclusions !== undefined ? { exclusionsJson: JSON.stringify(d.exclusions) } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.requiresApproval !== undefined ? { requiresApproval: d.requiresApproval } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(services.id, serviceId))
    .returning();

  if (!updated) {
    throw new AppError('NOT_FOUND', 'Service not found.', 404);
  }

  await recordAuditLog({
    actorUserId,
    action: 'SERVICE_UPDATED',
    targetType: 'SERVICE',
    targetId: serviceId,
  });

  return updated;
}

export async function getServiceById(serviceId: string) {
  const db = getDb();
  const [svc] = await db
    .select()
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);

  if (!svc) {
    throw new AppError('NOT_FOUND', 'Service not found.', 404);
  }
  return svc;
}

export async function createEvent(
  actorUserId: string,
  organisationId: string,
  rawInput: unknown
) {
  const parsed = createEventSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid event details.',
      400
    );
  }

  const d = parsed.data;
  if (new Date(d.endsAt).getTime() <= new Date(d.startsAt).getTime()) {
    throw new AppError('VALIDATION_ERROR', 'Event end time must be after start time.', 400);
  }

  const db = getDb();
  const [evt] = await db
    .insert(events)
    .values({
      organisationId,
      branchId: d.branchId ?? null,
      title: d.title,
      description: d.description,
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      venue: d.venue,
      capacity: d.capacity,
      basePricePaise: d.basePricePaise,
      status: 'ACTIVE',
    })
    .returning();

  await recordAuditLog({
    actorUserId,
    action: 'EVENT_CREATED',
    targetType: 'EVENT',
    targetId: evt!.id,
    metadata: { organisationId, capacity: d.capacity },
  });

  return evt!;
}

export async function searchCatalogue(filters: {
  q?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
}) {
  const db = getDb();
  const conditions = [eq(services.status, 'ACTIVE')];

  if (filters.q && filters.q.trim().length > 0) {
    const query = filters.q.trim();
    conditions.push(
      or(
        sql`to_tsvector('english', ${services.title} || ' ' || ${services.description}) @@ plainto_tsquery('english', ${query})`,
        ilike(services.title, `%${query}%`),
        ilike(services.description, `%${query}%`)
      )!
    );
  }

  if (filters.city && filters.city.trim().length > 0) {
    conditions.push(ilike(branches.city, `%${filters.city.trim()}%`));
  }

  const rows = await db
    .select({
      service: services,
      organisation: organisations,
      branch: branches,
    })
    .from(services)
    .innerJoin(organisations, eq(services.organisationId, organisations.id))
    .leftJoin(branches, eq(services.branchId, branches.id))
    .where(and(...conditions))
    .orderBy(desc(services.createdAt))
    .limit(Math.min(50, Math.max(1, filters.limit ?? 20)));

  if (
    typeof filters.lat === 'number' &&
    typeof filters.lng === 'number' &&
    typeof filters.radiusKm === 'number'
  ) {
    return rows.filter((row) => {
      if (row.branch?.lat == null || row.branch?.lng == null) return false;
      const distKm = haversineKm(filters.lat!, filters.lng!, row.branch.lat, row.branch.lng);
      return distKm <= filters.radiusKm!;
    });
  }

  return rows;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}
