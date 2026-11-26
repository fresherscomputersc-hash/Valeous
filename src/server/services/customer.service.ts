import { and, desc, eq, ne } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import {
  customerProfiles,
  needs,
  offerClaims,
  redemptions,
  users,
} from '@/server/db/schema';
import {
  customerInterestsUpdateSchema,
  customerProfileUpdateSchema,
  customerRequestSchema,
} from '@/server/validation/schemas';
import { recordAuditLog } from '@/server/audit/audit.service';

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

  const now = new Date().toISOString();
  let parsedInterests: string[] | undefined;
  if (d.preferences) {
    try {
      const parsedPrefs = JSON.parse(d.preferences) as { interests?: unknown };
      if (Array.isArray(parsedPrefs.interests)) {
        parsedInterests = parsedPrefs.interests
          .map((item) => String(item).trim())
          .filter(Boolean);
      }
    } catch {
      // Ignore non-JSON preferences strings
    }
  }

  const [updated] = await db
    .update(customerProfiles)
    .set({
      displayName: d.displayName,
      city: d.city,
      ...(parsedInterests !== undefined ? { interests: parsedInterests } : {}),
      updatedAt: now,
    })
    .where(eq(customerProfiles.id, customerId))
    .returning();

  await db
    .update(users)
    .set({ displayName: d.displayName, updatedAt: now })
    .where(eq(users.id, actorUserId));

  return updated!;
}

export async function listPassportItems(customerId: string) {
  const profile = await getCustomerProfileDetails(customerId);
  const db = getDb();

  const claims = await db
    .select()
    .from(offerClaims)
    .where(and(eq(offerClaims.customerId, customerId), ne(offerClaims.state, 'REMOVED')))
    .orderBy(desc(offerClaims.claimedAt));

  const customerNeeds = await db
    .select()
    .from(needs)
    .where(eq(needs.customerId, customerId))
    .orderBy(desc(needs.createdAt));

  return {
    interests: profile.interests ?? [],
    savedOffers: claims.map((c) => c.productId),
    claims,
    requests: customerNeeds.map((n) => ({
      id: n.id,
      productId: n.productId ?? undefined,
      categoryHint: n.categorySlug ?? undefined,
      pitchNote: n.notes ?? n.title,
      budgetRupees: n.budgetMaxPaise !== null ? Math.round(n.budgetMaxPaise / 100) : 0,
      status: n.status,
      createdAt: n.createdAt,
    })),
  };
}

export async function saveOfferToPassport(
  customerId: string,
  actorUserId: string,
  productId: string
) {
  await getCustomerProfileDetails(customerId);
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .insert(offerClaims)
    .values({
      customerId,
      productId,
      state: 'CLAIMED',
      claimedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [offerClaims.customerId, offerClaims.productId],
      set: {
        state: 'CLAIMED',
        updatedAt: now,
      },
    });

  await recordAuditLog({
    actorUserId,
    action: 'CUSTOMER_SAVED_OFFER',
    targetType: 'PRODUCT',
    targetId: productId,
    metadata: { customerId },
  });

  return listPassportItems(customerId);
}

export async function removeOfferFromPassport(
  customerId: string,
  actorUserId: string,
  productId: string
) {
  await getCustomerProfileDetails(customerId);
  const db = getDb();

  await db
    .delete(offerClaims)
    .where(and(eq(offerClaims.customerId, customerId), eq(offerClaims.productId, productId)));

  await recordAuditLog({
    actorUserId,
    action: 'CUSTOMER_REMOVED_OFFER',
    targetType: 'PRODUCT',
    targetId: productId,
    metadata: { customerId },
  });

  return listPassportItems(customerId);
}

export async function redeemPassportOffer(
  customerId: string,
  actorUserId: string,
  claimId: string,
  bookingRef?: string
) {
  const db = getDb();
  const now = new Date().toISOString();

  const result = await db.transaction(async (tx) => {
    const [claim] = await tx
      .select()
      .from(offerClaims)
      .where(and(eq(offerClaims.id, claimId), eq(offerClaims.customerId, customerId)))
      .limit(1);

    if (!claim) {
      throw new AppError('NOT_FOUND', 'Offer claim not found.', 404);
    }
    if (claim.state === 'REDEEMED') {
      throw new AppError('CONFLICT', 'Offer has already been redeemed.', 409);
    }

    const [redemption] = await tx
      .insert(redemptions)
      .values({
        claimId: claim.id,
        bookingRef: bookingRef ?? null,
        status: 'REDEEMED',
        redeemedAt: now,
      })
      .returning();

    await tx
      .update(offerClaims)
      .set({ state: 'REDEEMED', updatedAt: now })
      .where(eq(offerClaims.id, claim.id));

    await recordAuditLog(
      {
        actorUserId,
        action: 'CUSTOMER_REDEEMED_OFFER',
        targetType: 'OFFER_CLAIM',
        targetId: claim.id,
        metadata: { customerId, bookingRef: bookingRef ?? null },
      },
      tx
    );

    return redemption!;
  });

  return result;
}

export async function createCustomerRequest(
  customerId: string,
  actorUserId: string,
  rawInput: unknown
) {
  const parsed = customerRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid request details',
      400
    );
  }

  const profile = await getCustomerProfileDetails(customerId);
  const db = getDb();
  const d = parsed.data;

  if (d.productId) {
    const [existing] = await db
      .select()
      .from(needs)
      .where(and(eq(needs.customerId, customerId), eq(needs.productId, d.productId)))
      .limit(1);

    if (existing) {
      return {
        id: existing.id,
        productId: existing.productId ?? undefined,
        categoryHint: existing.categorySlug ?? undefined,
        pitchNote: existing.notes ?? existing.title,
        budgetRupees:
          existing.budgetMaxPaise !== null ? Math.round(existing.budgetMaxPaise / 100) : 0,
        status: existing.status,
        createdAt: existing.createdAt,
      };
    }
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const [inserted] = await db
    .insert(needs)
    .values({
      customerId,
      productId: d.productId ?? null,
      title: d.categoryHint || 'Customer Need',
      categorySlug: d.categoryHint ?? null,
      city: profile.city,
      budgetMaxPaise: Math.round(d.budgetRupees * 100),
      notes: d.pitchNote,
      status: 'OPEN',
      expiresAt,
    })
    .returning();

  const created = inserted!;
  await recordAuditLog({
    actorUserId,
    action: 'CUSTOMER_CREATED_REQUEST',
    targetType: 'CUSTOMER_REQUEST',
    targetId: created.id,
    metadata: { customerId, productId: created.productId ?? null },
  });

  return {
    id: created.id,
    productId: created.productId ?? undefined,
    categoryHint: created.categorySlug ?? undefined,
    pitchNote: created.notes ?? created.title,
    budgetRupees: created.budgetMaxPaise !== null ? Math.round(created.budgetMaxPaise / 100) : 0,
    status: created.status,
    createdAt: created.createdAt,
  };
}

export async function listCustomerRequests(customerId: string) {
  await getCustomerProfileDetails(customerId);
  const db = getDb();
  const rows = await db
    .select()
    .from(needs)
    .where(eq(needs.customerId, customerId))
    .orderBy(desc(needs.createdAt));

  return rows.map((n) => ({
    id: n.id,
    productId: n.productId ?? undefined,
    categoryHint: n.categorySlug ?? undefined,
    pitchNote: n.notes ?? n.title,
    budgetRupees: n.budgetMaxPaise !== null ? Math.round(n.budgetMaxPaise / 100) : 0,
    status: n.status,
    createdAt: n.createdAt,
  }));
}

export async function updateCustomerInterests(
  customerId: string,
  actorUserId: string,
  interests: string[]
) {
  const parsed = customerInterestsUpdateSchema.safeParse({ interests });
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid interests',
      400
    );
  }

  await getCustomerProfileDetails(customerId);
  const db = getDb();

  await db
    .update(customerProfiles)
    .set({
      interests: parsed.data.interests,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(customerProfiles.id, customerId));

  await recordAuditLog({
    actorUserId,
    action: 'CUSTOMER_UPDATED_INTERESTS',
    targetType: 'CUSTOMER_PROFILE',
    targetId: customerId,
    metadata: { interests: parsed.data.interests.join(', ') },
  });

  return listPassportItems(customerId);
}
