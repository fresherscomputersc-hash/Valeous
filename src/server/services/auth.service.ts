import { and, desc, eq, gt, isNull, lt, ne, sql } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getEnv } from '@/lib/env';
import { purgeExpiredRateLimitHits } from '@/lib/rate-limit';
import { getDb } from '@/server/db';
import {
  businessProfiles,
  customerProfiles,
  emailVerificationTokens,
  influencerProfiles,
  passwordResetTokens,
  promoSales,
  sessions,
  users,
} from '@/server/db/schema';
import {
  generateOpaqueToken,
  hashPassword,
  sha256Hex,
  verifyPassword,
} from '@/server/lib/crypto';
import { createSessionRecord } from '@/server/auth/session';
import { recordAuditLog } from '@/server/audit/audit.service';
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from '@/server/services/email.service';
import { createUserNotification } from '@/server/services/notification.service';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailTokenSchema,
} from '@/server/validation/schemas';

function slugifyBase(text: string): string {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);
  return cleaned.length >= 3 ? cleaned : `member-${Math.random().toString(36).slice(2, 6)}`;
}

export async function issueEmailVerificationForUser(user: {
  id: string;
  email: string;
  displayName: string;
}): Promise<{ verifyUrl: string; token: string; expiresAt: Date }> {
  const db = getDb();
  const rawToken = generateOpaqueToken(28);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  const verifyUrl = `${getEnv().APP_BASE_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await sendEmailVerificationEmail({
    toEmail: user.email,
    displayName: user.displayName,
    verifyUrl,
    expiresAtIso: expiresAt.toISOString(),
  });

  return { verifyUrl, token: rawToken, expiresAt };
}

export async function registerAccount(
  rawInput: unknown,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  const parsed = registerSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid registration details',
      400
    );
  }

  const input = parsed.data;
  const email = input.email.toLowerCase();
  const db = getDb();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new AppError(
      'EMAIL_TAKEN',
      'An account with this email address already exists.',
      409
    );
  }

  const passwordHash = await hashPassword(input.password);
  const baseHandle = input.handleOrSlug || slugifyBase(input.displayName);

  const createdUser = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email,
        passwordHash,
        displayName: input.displayName,
        role: input.role,
        status: 'ACTIVE',
      })
      .returning();

    if (!user) {
      throw new AppError('INTERNAL_ERROR', 'Failed to create user account', 500);
    }

    if (input.role === 'INFLUENCER') {
      const taken = await tx
        .select({ id: influencerProfiles.id })
        .from(influencerProfiles)
        .where(eq(influencerProfiles.handle, baseHandle))
        .limit(1);

      const finalHandle =
        taken.length > 0
          ? `${baseHandle}-${Math.floor(100 + Math.random() * 900)}`
          : baseHandle;

      await tx.insert(influencerProfiles).values({
        userId: user.id,
        handle: finalHandle,
        displayName: input.displayName,
        bio: `Creator promoting curated brands & products on social media.`,
        niche: input.niche || 'Lifestyle & Product Reviews',
      });
    } else if (input.role === 'CUSTOMER') {
      await tx.insert(customerProfiles).values({
        userId: user.id,
        displayName: input.displayName,
        city: input.city || 'Bhubaneswar',
      });
    } else {
      const taken = await tx
        .select({ id: businessProfiles.id })
        .from(businessProfiles)
        .where(eq(businessProfiles.slug, baseHandle))
        .limit(1);

      const finalSlug =
        taken.length > 0
          ? `${baseHandle}-${Math.floor(100 + Math.random() * 900)}`
          : baseHandle;

      await tx.insert(businessProfiles).values({
        userId: user.id,
        brandName: input.displayName,
        slug: finalSlug,
        description: `${input.displayName} partners with creators through trackable promo codes.`,
        city: input.city || 'Bhubaneswar',
        webhookKey: `whk_${generateOpaqueToken(12)}`,
        webhookSecret: `whsec_${generateOpaqueToken(24)}`,
      });
    }

    await recordAuditLog(
      {
        actorUserId: user.id,
        action: 'ACCOUNT_REGISTERED',
        targetType: 'USER',
        targetId: user.id,
        metadata: { role: input.role },
      },
      tx
    );

    return user;
  });

  const verification = await issueEmailVerificationForUser({
    id: createdUser.id,
    email: createdUser.email,
    displayName: createdUser.displayName,
  });

  await createUserNotification({
    userId: createdUser.id,
    type: 'WELCOME_VERIFY_EMAIL',
    title: 'Welcome to VALUEOUS! Verify your email',
    body: 'Confirm your email address in 1 click to unlock full account security and receipts.',
    href: `/verify-email?token=${encodeURIComponent(verification.token)}`,
  });

  const session = await createSessionRecord({
    userId: createdUser.id,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });

  return {
    user: {
      id: createdUser.id,
      email: createdUser.email,
      displayName: createdUser.displayName,
      role: createdUser.role,
      emailVerified: false,
    },
    session,
    verificationPath: `/verify-email?token=${encodeURIComponent(verification.token)}`,
  };
}

export async function loginUser(
  rawInput: unknown,
  meta?: { ipAddress?: string; userAgent?: string }
) {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Enter a valid email and password.', 400);
  }

  const email = parsed.data.email.toLowerCase();
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
  }

  const ok = await verifyPassword(user.passwordHash, parsed.data.password);
  if (!ok) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
  }

  if (user.status !== 'ACTIVE') {
    throw new AppError(
      'ACCOUNT_SUSPENDED',
      'Your account has been suspended. Please contact platform support.',
      403
    );
  }

  const session = await createSessionRecord({
    userId: user.id,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
    },
    session,
  };
}

export async function verifyEmailWithToken(rawInput: unknown) {
  const parsed = verifyEmailTokenSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Invalid email verification token.', 400);
  }

  const tokenHash = sha256Hex(parsed.data.token);
  const db = getDb();
  const now = new Date().toISOString();

  return db.transaction(async (tx) => {
    const [tokenRow] = await tx
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (!tokenRow) {
      throw new AppError(
        'INVALID_VERIFICATION_TOKEN',
        'This verification link is invalid or has expired.',
        400
      );
    }

    await tx
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(eq(emailVerificationTokens.id, tokenRow.id));

    const [updatedUser] = await tx
      .update(users)
      .set({ emailVerifiedAt: now, updatedAt: now })
      .where(eq(users.id, tokenRow.userId))
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      });

    await recordAuditLog(
      {
        actorUserId: tokenRow.userId,
        action: 'EMAIL_VERIFIED',
        targetType: 'USER',
        targetId: tokenRow.userId,
      },
      tx
    );

    return updatedUser!;
  });
}

export async function resendEmailVerification(userId: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found.', 404);
  }
  if (user.emailVerifiedAt) {
    return { alreadyVerified: true, verificationPath: null };
  }

  const issued = await issueEmailVerificationForUser({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  });

  return {
    alreadyVerified: false,
    verificationPath: `/verify-email?token=${encodeURIComponent(issued.token)}`,
  };
}

export async function changeUserPassword(params: {
  userId: string;
  currentSessionId: string;
  rawInput: unknown;
}) {
  const parsed = changePasswordSchema.safeParse(params.rawInput);
  if (!parsed.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message || 'Invalid password change input.',
      400
    );
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);
  if (!user) {
    throw new AppError('NOT_FOUND', 'User account not found.', 404);
  }

  const validCurrent = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!validCurrent) {
    throw new AppError('INVALID_CREDENTIALS', 'Your current password is incorrect.', 401);
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: newHash, updatedAt: now })
      .where(eq(users.id, params.userId));

    // Revoke all OTHER sessions while keeping the current session alive
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, params.userId),
          ne(sessions.id, params.currentSessionId),
          isNull(sessions.revokedAt)
        )
      );

    await recordAuditLog(
      {
        actorUserId: params.userId,
        action: 'PASSWORD_CHANGED',
        targetType: 'USER',
        targetId: params.userId,
      },
      tx
    );
  });
}

export async function listUserActiveSessions(userId: string, currentSessionId: string) {
  const db = getDb();
  const now = new Date().toISOString();
  const rows = await db
    .select({
      id: sessions.id,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now)
      )
    )
    .orderBy(desc(sessions.createdAt))
    .limit(25);

  return rows.map((r) => ({
    id: r.id,
    ipAddress: r.ipAddress || 'Unknown IP',
    userAgent: r.userAgent || 'Web Browser',
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    isCurrent: r.id === currentSessionId,
  }));
}

export async function revokeOtherUserSessions(userId: string, currentSessionId: string) {
  const db = getDb();
  const now = new Date().toISOString();
  const revoked = await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.id, currentSessionId),
        isNull(sessions.revokedAt)
      )
    )
    .returning({ id: sessions.id });

  await recordAuditLog({
    actorUserId: userId,
    action: 'OTHER_SESSIONS_REVOKED',
    targetType: 'USER',
    targetId: userId,
    metadata: { revokedCount: revoked.length },
  });

  return { revokedCount: revoked.length };
}

export async function logoutSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db
    .update(sessions)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(sessions.id, sessionId));
}

export async function requestPasswordReset(rawInput: unknown): Promise<{ accepted: true }> {
  const parsed = forgotPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Enter a valid email address.', 400);
  }

  const email = parsed.data.email.toLowerCase();
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user || user.status !== 'ACTIVE') {
    return { accepted: true };
  }

  const rawToken = generateOpaqueToken(32);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
  });

  const resetUrl = `${getEnv().APP_BASE_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  await sendPasswordResetEmail({
    toEmail: user.email,
    displayName: user.displayName,
    resetUrl,
    expiresAtIso: expiresAt.toISOString(),
  });

  return { accepted: true };
}

export async function resetPasswordWithToken(rawInput: unknown): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Invalid token or password.', 400);
  }

  const tokenHash = sha256Hex(parsed.data.token);
  const newPasswordHash = await hashPassword(parsed.data.newPassword);
  const db = getDb();
  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    const [tokenRow] = await tx
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now)
        )
      )
      .limit(1);

    if (!tokenRow) {
      throw new AppError(
        'INVALID_RESET_TOKEN',
        'This password reset link is invalid or has expired.',
        400
      );
    }

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(eq(passwordResetTokens.id, tokenRow.id));

    await tx
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: now })
      .where(eq(users.id, tokenRow.userId));

    // Revoke all existing sessions on password change
    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.userId, tokenRow.userId), isNull(sessions.revokedAt)));
  });
}

export async function runHousekeepingTasks() {
  const db = getDb();
  const now = new Date().toISOString();

  const expiredSessions = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  const expiredResetTokens = await db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, now))
    .returning({ id: passwordResetTokens.id });

  const expiredVerifyTokens = await db
    .delete(emailVerificationTokens)
    .where(lt(emailVerificationTokens.expiresAt, now))
    .returning({ id: emailVerificationTokens.id });

  await purgeExpiredRateLimitHits();

  // Auto-release any matured PENDING_CLEARANCE promo sales whose return window passed
  const maturedSales = await db
    .select({
      id: promoSales.id,
      influencerId: promoSales.influencerId,
      commissionAmountPaise: promoSales.commissionAmountPaise,
    })
    .from(promoSales)
    .where(
      and(
        eq(promoSales.status, 'PENDING_CLEARANCE'),
        lt(promoSales.clearsAt, now)
      )
    )
    .limit(200);

  let clearedSalesCount = 0;
  for (const sale of maturedSales) {
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(promoSales)
        .set({ status: 'CONFIRMED' })
        .where(
          and(eq(promoSales.id, sale.id), eq(promoSales.status, 'PENDING_CLEARANCE'))
        )
        .returning({ id: promoSales.id });

      if (updated) {
        await tx
          .update(influencerProfiles)
          .set({
            pendingClearancePaise: sql`max(0, ${influencerProfiles.pendingClearancePaise} - ${sale.commissionAmountPaise})`,
            availableBalancePaise: sql`${influencerProfiles.availableBalancePaise} + ${sale.commissionAmountPaise}`,
            updatedAt: now,
          })
          .where(eq(influencerProfiles.id, sale.influencerId));
        clearedSalesCount++;
      }
    });
  }

  return {
    purgedSessions: expiredSessions.length,
    purgedResetTokens: expiredResetTokens.length,
    purgedVerifyTokens: expiredVerifyTokens.length,
    clearedSalesCount,
    ranAt: now,
  };
}
