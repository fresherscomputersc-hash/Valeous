import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { getEnv } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import {
  businessProfiles,
  customerProfiles,
  influencerProfiles,
  sessions,
  users,
} from '@/server/db/schema';
import {
  generateOpaqueToken,
  sha256Hex,
  signSessionCookie,
  verifySessionCookie,
} from '@/server/lib/crypto';

export const SESSION_COOKIE_NAME = 'pb_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthenticatedActor {
  sessionId: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: 'INFLUENCER' | 'BUSINESS' | 'ADMIN' | 'CUSTOMER';
    avatarUrl: string | null;
    status: 'ACTIVE' | 'SUSPENDED';
    emailVerified: boolean;
  };
  businessProfile: {
    id: string;
    brandName: string;
    slug: string;
    city: string;
    walletBalancePaise: number;
  } | null;
  influencerProfile: {
    id: string;
    handle: string;
    displayName: string;
    niche: string;
    availableBalancePaise: number;
    pendingClearancePaise: number;
  } | null;
  customerProfile: {
    id: string;
    displayName: string;
    city: string;
    preferences: string | null;
  } | null;
}

export async function createSessionRecord(params: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ sessionId: string; cookieValue: string; expiresAt: Date }> {
  const db = getDb();
  const rawToken = generateOpaqueToken(32);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [created] = await db
    .insert(sessions)
    .values({
      userId: params.userId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    })
    .returning({ id: sessions.id });

  if (!created) {
    throw new AppError('INTERNAL_ERROR', 'Failed to establish session', 500);
  }

  const cookieValue = await signSessionCookie({ sid: created.id, tok: rawToken }, expiresAt);
  return { sessionId: created.id, cookieValue, expiresAt };
}

export function attachSessionCookie(
  response: NextResponse,
  cookieValue: string,
  expiresAt: Date,
  request?: NextRequest
): void {
  const env = getEnv();
  const forwardedProto = request?.headers.get('x-forwarded-proto');
  const isHttps =
    forwardedProto === 'https' ||
    request?.nextUrl.protocol === 'https:' ||
    env.NODE_ENV === 'production';

  const usePartitionedNone = isHttps && env.COOKIE_PARTITIONED_PREVIEW === 'true';

  if (usePartitionedNone) {
    const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=${cookieValue}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=None; Partitioned`
    );
    return;
  }

  response.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse, request?: NextRequest): void {
  const env = getEnv();
  const forwardedProto = request?.headers.get('x-forwarded-proto');
  const isHttps =
    forwardedProto === 'https' ||
    request?.nextUrl.protocol === 'https:' ||
    env.NODE_ENV === 'production';
  const usePartitionedNone = isHttps && env.COOKIE_PARTITIONED_PREVIEW === 'true';

  if (usePartitionedNone) {
    response.headers.append(
      'Set-Cookie',
      `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
    );
    return;
  }

  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function extractRawSessionTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer.length > 16) return bearer;
  }

  return null;
}

export async function resolveActorFromCookieValue(
  cookieValue: string | undefined | null
): Promise<AuthenticatedActor | null> {
  if (!cookieValue) return null;

  const verified = await verifySessionCookie(cookieValue);
  if (!verified) return null;

  const db = getDb();
  const now = new Date().toISOString();
  const tokenHash = sha256Hex(verified.tok);

  const sessionRows = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      avatarUrl: users.avatarUrl,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, verified.sid),
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now)
      )
    )
    .limit(1);

  const row = sessionRows[0];
  if (!row || row.status !== 'ACTIVE') {
    return null;
  }

  const [bizRows, infRows, custRows] = await Promise.all([
    db
      .select({
        id: businessProfiles.id,
        brandName: businessProfiles.brandName,
        slug: businessProfiles.slug,
        city: businessProfiles.city,
        walletBalancePaise: businessProfiles.walletBalancePaise,
      })
      .from(businessProfiles)
      .where(eq(businessProfiles.userId, row.userId))
      .limit(1),
    db
      .select({
        id: influencerProfiles.id,
        handle: influencerProfiles.handle,
        displayName: influencerProfiles.displayName,
        niche: influencerProfiles.niche,
        availableBalancePaise: influencerProfiles.availableBalancePaise,
        pendingClearancePaise: influencerProfiles.pendingClearancePaise,
      })
      .from(influencerProfiles)
      .where(eq(influencerProfiles.userId, row.userId))
      .limit(1),
    db
      .select({
        id: customerProfiles.id,
        displayName: customerProfiles.displayName,
        city: customerProfiles.city,
        preferences: customerProfiles.preferences,
      })
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, row.userId))
      .limit(1),
  ]);

  return {
    sessionId: row.sessionId,
    user: {
      id: row.userId,
      email: row.email,
      displayName: row.displayName,
      role: row.role as 'INFLUENCER' | 'BUSINESS' | 'ADMIN' | 'CUSTOMER',
      avatarUrl: row.avatarUrl,
      status: row.status,
      emailVerified: Boolean(row.emailVerifiedAt),
    },
    businessProfile: bizRows[0] ?? null,
    influencerProfile: infRows[0] ?? null,
    customerProfile: custRows[0] ?? null,
  };
}

export async function resolveActorFromRequest(
  request: NextRequest
): Promise<AuthenticatedActor | null> {
  const token = extractRawSessionTokenFromRequest(request);
  return resolveActorFromCookieValue(token);
}

export async function getCurrentActor(): Promise<AuthenticatedActor | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawCookie) {
    return resolveActorFromCookieValue(rawCookie);
  }

  const h = await headers();
  const authHeader = h.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return resolveActorFromCookieValue(authHeader.slice(7).trim());
  }

  return null;
}

export async function getRequestMeta(request?: NextRequest): Promise<{
  ipAddress: string;
  userAgent: string;
}> {
  if (request) {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    return {
      ipAddress: forwarded || request.headers.get('x-real-ip') || '127.0.0.1',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };
  }

  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return {
    ipAddress: forwarded || h.get('x-real-ip') || '127.0.0.1',
    userAgent: h.get('user-agent') || 'unknown',
  };
}

export function verifyMutationOrigin(request: NextRequest): void {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw new AppError('CSRF_REJECTED', 'Invalid request origin header', 403);
  }

  const requestHost = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    ''
  )
    .split(',')[0]
    ?.trim()
    .toLowerCase();

  if (requestHost && originHost === requestHost) {
    return;
  }

  const allowedPatterns = getEnv()
    .ALLOWED_ORIGINS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  for (const pattern of allowedPatterns) {
    try {
      if (pattern.includes('*')) {
        const suffix = pattern.replace(/^https?:\/\/\*/, '');
        if (originHost.endsWith(suffix)) return;
      } else {
        const parsed = new URL(pattern);
        if (parsed.host.toLowerCase() === originHost) return;
      }
    } catch {
      // ignore malformed pattern
    }
  }

  throw new AppError('CSRF_REJECTED', 'Cross-origin mutation request blocked', 403);
}
