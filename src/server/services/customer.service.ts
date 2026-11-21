import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import { customerProfiles, users } from '@/server/db/schema';
import { customerProfileUpdateSchema } from '@/server/validation/schemas';

interface CustomerPreferences {
  interests?: unknown;
  savedOffers?: unknown;
  requests?: unknown;
  [key: string]: unknown;
}

function parsePreferences(prefs: string): CustomerPreferences {
  try {
    const parsed = JSON.parse(prefs || '{}');
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as CustomerPreferences)
      : {};
  } catch {
    return {};
  }
}

export async function getCustomerProfileDetails(customerId: string) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.id, customerId))
    .limit(1);

  if (!profile) {
    throw new AppError('NOT_FOUND', 'Customer profile not found.', 404);
  }
  return profile;
}

export async function updateCustomerProfileDetails(
  customerId: string,
  actorUserId: string,
  rawInput: unknown
) {
  const parsed = customerProfileUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid customer profile details',
      400
    );
  }

  const d = parsed.data;
  const db = getDb();

  const [existing] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.id, customerId))
    .limit(1);

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Customer profile not found.', 404);
  }

  // Merge incoming preference fields so saved offers and requests survive
  // profile edits that only intend to change interests.
  const mergedPreferences = {
    ...parsePreferences(existing.preferences),
    ...(d.preferences ? parsePreferences(d.preferences) : {}),
  };

  const [updated] = await db
    .update(customerProfiles)
    .set({
      displayName: d.displayName,
      city: d.city,
      preferences: JSON.stringify(mergedPreferences),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(customerProfiles.id, customerId))
    .returning();

  await db
    .update(users)
    .set({ displayName: d.displayName, updatedAt: new Date().toISOString() })
    .where(eq(users.id, actorUserId));

  return updated!;
}

// NEW: Customer Passport & Discovery functions

export async function listPassportItems(customerId: string) {
  const profile = await getCustomerProfileDetails(customerId);
  return parsePreferences(profile.preferences);
}

export async function saveOfferToPassport(
  customerId: string,
  actorUserId: string,
  productId: string
) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.id, customerId))
    .limit(1);

  if (!profile) {
    throw new AppError('NOT_FOUND', 'Customer profile not found.', 404);
  }

  const prefs = parsePreferences(profile.preferences);
  const savedOffers: string[] = Array.isArray(prefs.savedOffers)
    ? prefs.savedOffers.filter((id): id is string => typeof id === 'string')
    : [];
  if (!savedOffers.includes(productId)) savedOffers.push(productId);
  prefs.savedOffers = savedOffers;

  await db
    .update(customerProfiles)
    .set({ preferences: JSON.stringify(prefs), updatedAt: new Date().toISOString() })
    .where(eq(customerProfiles.id, customerId));

  // Audit log
  const { recordAuditLog } = await import('@/server/audit/audit.service');
  await recordAuditLog({
    actorUserId,
    action: 'CUSTOMER_SAVED_OFFER',
    targetType: 'PRODUCT',
    targetId: productId,
    metadata: { customerId },
  });

  return prefs;
}

export async function removeOfferFromPassport(
  customerId: string,
  actorUserId: string,
  productId: string
) {
  const db = getDb();
  const [profile] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.id, customerId))
    .limit(1);

  if (!profile) {
    throw new AppError('NOT_FOUND', 'Customer profile not found.', 404);
  }

  const prefs = parsePreferences(profile.preferences);
  if (Array.isArray(prefs.savedOffers)) {
    prefs.savedOffers = prefs.savedOffers.filter(
      (id): id is string => typeof id === 'string' && id !== productId
    );
  }

  await db
    .update(customerProfiles)
    .set({ preferences: JSON.stringify(prefs), updatedAt: new Date().toISOString() })
    .where(eq(customerProfiles.id, customerId));

  const { recordAuditLog } = await import('@/server/audit/audit.service');
  await recordAuditLog({
    actorUserId,
    action: 'CUSTOMER_REMOVED_OFFER',
    targetType: 'PRODUCT',
    targetId: productId,
    metadata: { customerId },
  });

  return prefs;
}

export async function createCustomerRequest(
  customerId: string,
  actorUserId: string,
  rawInput: unknown
) {
  const { customerRequestSchema } = await import('@/server/validation/schemas');
  const parsed = customerRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid request details',
      400
    );
  }

  const db = getDb();
  const [profile] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.id, customerId))
    .limit(1);

  if (!profile) {
    throw new AppError('NOT_FOUND', 'Customer profile not found.', 404);
  }

  const prefs = parsePreferences(profile.preferences);
  const requestList: unknown[] = Array.isArray(prefs.requests) ? prefs.requests : [];

  const newReq = {
    ...parsed.data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'OPEN',
  };

  // Deduplicate by productId
  const exists = requestList.some(
    (r) =>
      typeof r === 'object' &&
      r !== null &&
      'productId' in r &&
      (r as { productId?: string }).productId === newReq.productId
  );
  if (!exists) {
    requestList.unshift(newReq);
  }
  prefs.requests = requestList;

  await db
    .update(customerProfiles)
    .set({ preferences: JSON.stringify(prefs), updatedAt: new Date().toISOString() })
    .where(eq(customerProfiles.id, customerId));

  const { recordAuditLog } = await import('@/server/audit/audit.service');
  await recordAuditLog({
    actorUserId,
    action: 'CUSTOMER_CREATED_REQUEST',
    targetType: 'CUSTOMER_REQUEST',
    targetId: newReq.id,
    metadata: { customerId, productId: newReq.productId ?? null },
  });

  return newReq;
}

export async function listCustomerRequests(customerId: string): Promise<unknown[]> {
  const profile = await getCustomerProfileDetails(customerId);
  const prefs = parsePreferences(profile.preferences);
  return Array.isArray(prefs.requests) ? prefs.requests : [];
}

export async function updateCustomerInterests(
  customerId: string,
  actorUserId: string,
  interests: string[]
) {
  const { customerInterestsUpdateSchema } = await import('@/server/validation/schemas');
  const parsed = customerInterestsUpdateSchema.safeParse({ interests });
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid interests',
      400
    );
  }

  const db = getDb();
  const [profile] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.id, customerId))
    .limit(1);

  if (!profile) {
    throw new AppError('NOT_FOUND', 'Customer profile not found.', 404);
  }

  const prefs = parsePreferences(profile.preferences);
  prefs.interests = parsed.data.interests;

  await db
    .update(customerProfiles)
    .set({ preferences: JSON.stringify(prefs), updatedAt: new Date().toISOString() })
    .where(eq(customerProfiles.id, customerId));

  const { recordAuditLog } = await import('@/server/audit/audit.service');
  await recordAuditLog({
    actorUserId,
    action: 'CUSTOMER_UPDATED_INTERESTS',
    targetType: 'CUSTOMER_PROFILE',
    targetId: customerId,
    metadata: { interests: parsed.data.interests.join(', ') },
  });

  return prefs;
}
