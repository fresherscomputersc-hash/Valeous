import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import {
  branches,
  memberships,
  organisations,
  orgRoleEnum,
  verificationRecords,
} from '@/server/db/schema';
import { recordAuditLog } from '@/server/audit/audit.service';

const createOrgSchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  tradeName: z.string().trim().min(2).max(160),
  type: z.enum(['BUSINESS', 'INDIVIDUAL', 'EVENT_ORGANISER']).default('BUSINESS'),
});

const submitKycSchema = z.object({
  evidenceRef: z.string().trim().min(3).max(500),
});

const decideKycSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().min(3).max(400),
});

const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80).default('Bhubaneswar'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  timezone: z.string().trim().default('Asia/Kolkata'),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  orgRole: z.enum(orgRoleEnum),
});

export async function createOrganisation(actorUserId: string, rawInput: unknown) {
  const parsed = createOrgSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid organisation details.',
      400
    );
  }

  const db = getDb();
  const created = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organisations)
      .values({
        legalName: parsed.data.legalName,
        tradeName: parsed.data.tradeName,
        type: parsed.data.type,
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
      })
      .returning();

    await tx.insert(memberships).values({
      userId: actorUserId,
      organisationId: org!.id,
      branchId: null,
      orgRole: 'ORG_OWNER',
      status: 'ACTIVE',
    });

    await recordAuditLog(
      {
        actorUserId,
        action: 'ORG_CREATED',
        targetType: 'ORGANISATION',
        targetId: org!.id,
        metadata: { tradeName: org!.tradeName },
      },
      tx
    );

    return org!;
  });

  return created;
}

export async function listUserOrganisations(userId: string) {
  const db = getDb();
  const rows = await db
    .select({
      organisation: organisations,
      membership: memberships,
    })
    .from(memberships)
    .innerJoin(organisations, eq(memberships.organisationId, organisations.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, 'ACTIVE')))
    .orderBy(desc(organisations.createdAt));

  return rows;
}

export async function submitKycVerification(
  actorUserId: string,
  organisationId: string,
  rawInput: unknown
) {
  const parsed = submitKycSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid KYC evidence.',
      400
    );
  }

  const db = getDb();
  const [org] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .limit(1);

  if (!org) {
    throw new AppError('NOT_FOUND', 'Organisation not found.', 404);
  }

  const [record] = await db
    .insert(verificationRecords)
    .values({
      subjectType: 'ORGANISATION',
      subjectId: organisationId,
      kind: 'kyc',
      status: 'PENDING',
      evidenceRef: parsed.data.evidenceRef,
    })
    .returning();

  await recordAuditLog({
    actorUserId,
    action: 'ORG_KYC_SUBMITTED',
    targetType: 'VERIFICATION_RECORD',
    targetId: record!.id,
    metadata: { organisationId },
  });

  return record!;
}

export async function decideVerification(
  adminUserId: string,
  verificationId: string,
  rawInput: unknown
) {
  const parsed = decideKycSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid verification decision.',
      400
    );
  }

  const db = getDb();
  const now = new Date().toISOString();

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(verificationRecords)
      .where(eq(verificationRecords.id, verificationId))
      .limit(1);

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Verification record not found.', 404);
    }

    const [updated] = await tx
      .update(verificationRecords)
      .set({
        status: parsed.data.decision,
        reviewerId: adminUserId,
        decidedAt: now,
        reason: parsed.data.reason,
      })
      .where(eq(verificationRecords.id, verificationId))
      .returning();

    if (existing.subjectType === 'ORGANISATION') {
      await tx
        .update(organisations)
        .set({
          verificationStatus: parsed.data.decision,
          updatedAt: now,
        })
        .where(eq(organisations.id, existing.subjectId));
    }

    await recordAuditLog(
      {
        actorUserId: adminUserId,
        action: `VERIFICATION_${parsed.data.decision}`,
        targetType: 'VERIFICATION_RECORD',
        targetId: verificationId,
        reason: parsed.data.reason,
        metadata: { subjectType: existing.subjectType, subjectId: existing.subjectId },
      },
      tx
    );

    return updated!;
  });
}

export async function createBranch(
  actorUserId: string,
  organisationId: string,
  rawInput: unknown
) {
  const parsed = createBranchSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid branch details.',
      400
    );
  }

  const db = getDb();
  const [branch] = await db
    .insert(branches)
    .values({
      organisationId,
      name: parsed.data.name,
      city: parsed.data.city,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      timezone: parsed.data.timezone,
      status: 'ACTIVE',
    })
    .returning();

  await recordAuditLog({
    actorUserId,
    action: 'BRANCH_CREATED',
    targetType: 'BRANCH',
    targetId: branch!.id,
    metadata: { organisationId, name: branch!.name },
  });

  return branch!;
}

export async function listOrganisationBranches(organisationId: string) {
  const db = getDb();
  return db
    .select()
    .from(branches)
    .where(eq(branches.organisationId, organisationId))
    .orderBy(desc(branches.createdAt));
}

export async function addStaffMembership(
  actorUserId: string,
  organisationId: string,
  rawInput: unknown
) {
  const parsed = addMemberSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid membership payload.',
      400
    );
  }

  const db = getDb();
  const [member] = await db
    .insert(memberships)
    .values({
      userId: parsed.data.userId,
      organisationId,
      branchId: parsed.data.branchId ?? null,
      orgRole: parsed.data.orgRole,
      status: 'ACTIVE',
    })
    .returning();

  await recordAuditLog({
    actorUserId,
    action: 'ORG_MEMBER_ADDED',
    targetType: 'MEMBERSHIP',
    targetId: member!.id,
    metadata: {
      organisationId,
      targetUserId: parsed.data.userId,
      orgRole: parsed.data.orgRole,
    },
  });

  return member!;
}

export async function listOrganisationMembers(organisationId: string) {
  const db = getDb();
  return db
    .select()
    .from(memberships)
    .where(eq(memberships.organisationId, organisationId))
    .orderBy(desc(memberships.createdAt));
}
