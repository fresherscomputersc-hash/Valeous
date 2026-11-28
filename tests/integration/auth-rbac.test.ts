import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { AppError } from '@/lib/errors';
import { getDb } from '@/server/db';
import {
  branches,
  categories,
  memberships,
  organisations,
  otpChallenges,
  type OrgRole,
  users,
} from '@/server/db/schema';
import { SESSION_COOKIE_NAME } from '@/server/auth/session';
import { generateTotpCode } from '@/server/auth/totp';
import { hashPassword } from '@/server/lib/crypto';
import { requireOrgRole } from '@/server/permissions/rbac';
import {
  loginUser,
  logoutSession,
  registerAccount,
} from '@/server/services/auth.service';
import { applyForProductEnrollment, decideEnrollmentByBusiness } from '@/server/services/enrollment.service';
import { createBusinessProduct, updateInfluencerProfileDetails } from '@/server/services/marketplace.service';
import {
  depositBrandWallet,
  logOrPreviewPromoSale,
  requestInfluencerPayout,
} from '@/server/services/sales-wallet.service';
import { GET as adminOverviewGet } from '@/app/api/admin/overview/route';
import { POST as adminPayoutPost } from '@/app/api/admin/payouts/[id]/route';
import { POST as adminUserStatusPost } from '@/app/api/admin/users/[id]/route';
import { GET as authMeGet } from '@/app/api/auth/me/route';
import { POST as authLoginPost } from '@/app/api/auth/login/route';
import { POST as authMfaEnrollPost } from '@/app/api/auth/mfa/enroll/route';
import { POST as authMfaVerifyPost } from '@/app/api/auth/mfa/verify/route';
import { POST as authOtpRequestPost } from '@/app/api/auth/otp/request/route';
import { POST as authOtpVerifyPost } from '@/app/api/auth/otp/verify/route';
import {
  DELETE as authSessionsDelete,
  GET as authSessionsGet,
} from '@/app/api/auth/sessions/route';
import { GET as businessDashboardGet } from '@/app/api/business/dashboard/route';
import { POST as businessEnrollmentDecidePost } from '@/app/api/business/enrollments/[id]/route';
import { GET as businessEnrollmentsGet } from '@/app/api/business/enrollments/route';
import { POST as businessIntegrationsRotatePost } from '@/app/api/business/integrations/rotate/route';
import { GET as businessProductsGet } from '@/app/api/business/products/route';
import { GET as businessProductByIdGet } from '@/app/api/business/products/[id]/route';
import {
  GET as businessProfileGet,
  PATCH as businessProfilePatch,
} from '@/app/api/business/profile/route';
import {
  GET as businessSalesGet,
  POST as businessSalesPost,
} from '@/app/api/business/sales/route';
import { PATCH as businessSaleByIdPatch } from '@/app/api/business/sales/[id]/route';
import {
  GET as businessWalletGet,
  POST as businessWalletPost,
} from '@/app/api/business/wallet/route';
import { POST as cronHousekeepingPost } from '@/app/api/cron/housekeeping/route';
import { GET as customerDashboardGet } from '@/app/api/customer/dashboard/route';
import { PATCH as customerInterestsPatch } from '@/app/api/customer/interests/route';
import { GET as customerOffersGet } from '@/app/api/customer/offers/route';
import {
  GET as customerPassportGet,
  POST as customerPassportPost,
} from '@/app/api/customer/passport/route';
import {
  GET as customerProfileGet,
  PATCH as customerProfilePatch,
} from '@/app/api/customer/profile/route';
import { GET as customerRecommendationsGet } from '@/app/api/customer/recommendations/route';
import {
  GET as customerRequestGet,
  POST as customerRequestPost,
} from '@/app/api/customer/request/route';
import { GET as influencerDashboardGet } from '@/app/api/influencer/dashboard/route';
import {
  GET as influencerEnrollmentsGet,
  POST as influencerEnrollmentsPost,
} from '@/app/api/influencer/enrollments/route';
import { POST as influencerPayoutsPost } from '@/app/api/influencer/payouts/route';
import { GET as influencerPayoutReceiptGet } from '@/app/api/influencer/payouts/[id]/route';
import {
  GET as influencerProfileGet,
  PATCH as influencerProfilePatch,
} from '@/app/api/influencer/profile/route';
import {
  GET as notificationsGet,
  PATCH as notificationsPatch,
} from '@/app/api/notifications/route';
import { truncateAllTables } from '../setup';

type ActorKey =
  | 'unauthenticated'
  | 'invalidToken'
  | 'revoked'
  | 'suspended'
  | 'customer'
  | 'influencer'
  | 'business'
  | 'admin';

interface ActorContext {
  userId?: string;
  cookieValue?: string;
  bearerToken?: string;
}

interface EndpointCase {
  name: string;
  allowedRole: 'CUSTOMER' | 'INFLUENCER' | 'BUSINESS' | 'ADMIN' | 'ANY_AUTH';
  invoke: (actor: ActorContext) => Promise<Response>;
}

function buildRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    actor?: ActorContext;
    body?: unknown;
    origin?: string | null;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers);
  headers.set('host', 'localhost:3000');

  if (method !== 'GET' && options.origin !== null) {
    headers.set('origin', options.origin ?? 'http://localhost:3000');
  }

  if (options.actor?.cookieValue) {
    headers.set('cookie', `${SESSION_COOKIE_NAME}=${options.actor.cookieValue}`);
  } else if (options.actor?.bearerToken) {
    headers.set('authorization', `Bearer ${options.actor.bearerToken}`);
  }

  let bodyStr: string | undefined;
  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
    bodyStr = JSON.stringify(options.body);
  }

  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers,
    body: bodyStr,
  });
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  const json = (await response.json()) as { error?: { code?: string } };
  return json.error?.code;
}

async function seedActors() {
  const db = getDb();

  const [category] = await db
    .insert(categories)
    .values({ name: 'Wellness', slug: 'wellness' })
    .returning();

  const customerReg = await registerAccount({
    role: 'CUSTOMER',
    displayName: 'Priya Customer',
    email: 'customer.rbac@test.local',
    password: 'Password123!',
    city: 'Bhubaneswar',
  });

  const influencerReg = await registerAccount({
    role: 'INFLUENCER',
    displayName: 'Ananya Creator',
    handleOrSlug: 'ananya-creator',
    email: 'creator.rbac@test.local',
    password: 'Password123!',
    niche: 'Wellness',
  });

  const businessReg = await registerAccount({
    role: 'BUSINESS',
    displayName: 'Glow Wellness Studio',
    handleOrSlug: 'glow-wellness',
    email: 'business.rbac@test.local',
    password: 'Password123!',
    city: 'Bhubaneswar',
  });

  const [adminUser] = await db
    .insert(users)
    .values({
      email: 'admin.rbac@test.local',
      passwordHash: await hashPassword('AdminPass123!'),
      displayName: 'Platform Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    })
    .returning();
  const adminLogin = await loginUser({
    email: 'admin.rbac@test.local',
    password: 'AdminPass123!',
  });

  const suspendedReg = await registerAccount({
    role: 'CUSTOMER',
    displayName: 'Suspended User',
    email: 'suspended.rbac@test.local',
    password: 'Password123!',
  });
  await db
    .update(users)
    .set({ status: 'SUSPENDED' })
    .where(eq(users.id, suspendedReg.user.id));

  const revokedReg = await registerAccount({
    role: 'CUSTOMER',
    displayName: 'Revoked User',
    email: 'revoked.rbac@test.local',
    password: 'Password123!',
  });
  await logoutSession(revokedReg.session.sessionId);

  // Seed one active product, wallet balance, enrollment, sale, and payout for positive-path assertions
  const [bizRow] = await db.query.businessProfiles.findMany({
    where: (t, { eq: eqCol }) => eqCol(t.userId, businessReg.user.id),
    limit: 1,
  });
  const [infRow] = await db.query.influencerProfiles.findMany({
    where: (t, { eq: eqCol }) => eqCol(t.userId, influencerReg.user.id),
    limit: 1,
  });

  await updateInfluencerProfileDetails(infRow!.id, influencerReg.user.id, {
    displayName: 'Ananya Creator',
    bio: 'Verified wellness creator sharing local studio reviews.',
    niche: 'Wellness',
    followerCount: 12000,
    upiId: 'ananya@okaxis',
  });

  await depositBrandWallet({
    businessId: bizRow!.id,
    actorUserId: businessReg.user.id,
    rawInput: { amountRupees: 5000, paymentMethod: 'UPI', reference: 'DEP-RBAC-1' },
  });

  const product = await createBusinessProduct(bizRow!.id, businessReg.user.id, {
    title: 'Signature Facial Package',
    categoryId: category!.id,
    description: 'Relaxing 45-minute wellness facial treatment for verified bookings.',
    retailPriceRupees: 1200,
    commissionType: 'FIXED_PER_SALE',
    commissionFixedRupees: 300,
    buyerDiscountPercent: 10,
    promoCodePrefix: 'GLOW',
  });

  const product2 = await createBusinessProduct(bizRow!.id, businessReg.user.id, {
    title: 'Aromatherapy Spa Session',
    categoryId: category!.id,
    description: 'Full 60-minute aromatherapy massage and spa experience.',
    retailPriceRupees: 1800,
    commissionType: 'FIXED_PER_SALE',
    commissionFixedRupees: 250,
    buyerDiscountPercent: 10,
    promoCodePrefix: 'AROM',
  });

  const enrollment = await applyForProductEnrollment(infRow!.id, influencerReg.user.id, {
    productId: product.id,
    pitchNote: 'Will feature this studio in my Bhubaneswar wellness reel.',
  });
  await decideEnrollmentByBusiness({
    enrollmentId: enrollment.id,
    businessId: bizRow!.id,
    actorUserId: businessReg.user.id,
    rawInput: { action: 'APPROVE', customPromoCode: 'GLOW-ANANYA' },
  });

  await logOrPreviewPromoSale({
    businessId: bizRow!.id,
    actorUserId: businessReg.user.id,
    source: 'MANUAL',
    rawInput: {
      promoCode: 'GLOW-ANANYA',
      quantity: 2,
      orderReference: 'ORD-RBAC-1',
      settlementMode: 'INSTANT',
    },
  });

  const payout = await requestInfluencerPayout(infRow!.id, influencerReg.user.id, {
    amountRupees: 200,
    note: 'RBAC test payout',
  });

  const actors: Record<ActorKey, ActorContext> = {
    unauthenticated: {},
    invalidToken: { bearerToken: 'invalid.jwt.token.payload.signature' },
    revoked: { cookieValue: revokedReg.session.cookieValue },
    suspended: {
      userId: suspendedReg.user.id,
      cookieValue: suspendedReg.session.cookieValue,
    },
    customer: {
      userId: customerReg.user.id,
      cookieValue: customerReg.session.cookieValue,
    },
    influencer: {
      userId: influencerReg.user.id,
      cookieValue: influencerReg.session.cookieValue,
    },
    business: {
      userId: businessReg.user.id,
      cookieValue: businessReg.session.cookieValue,
    },
    admin: {
      userId: adminUser!.id,
      cookieValue: adminLogin.session.cookieValue,
    },
  };

  return {
    actors,
    categoryId: category!.id,
    productId: product.id,
    product2Id: product2.id,
    payoutId: payout.id,
    targetUserId: customerReg.user.id,
  };
}

describe('Integration (Testcontainers PG17): Auth & RBAC Matrix (VLS-111)', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('enforces 401/403 across the complete role x endpoint matrix on real PostgreSQL 17', async () => {
    const seeded = await seedActors();

    const endpoints: EndpointCase[] = [
      // Admin endpoints
      {
        name: 'GET /api/admin/overview',
        allowedRole: 'ADMIN',
        invoke: (actor) => adminOverviewGet(buildRequest('/api/admin/overview', { actor })),
      },
      {
        name: 'POST /api/admin/payouts/[id]',
        allowedRole: 'ADMIN',
        invoke: (actor) =>
          adminPayoutPost(
            buildRequest(`/api/admin/payouts/${seeded.payoutId}`, {
              method: 'POST',
              actor,
              body: { action: 'PAY', paymentReference: 'UTR-RBAC-001' },
            }),
            { params: Promise.resolve({ id: seeded.payoutId }) }
          ),
      },
      {
        name: 'POST /api/admin/users/[id]',
        allowedRole: 'ADMIN',
        invoke: (actor) =>
          adminUserStatusPost(
            buildRequest(`/api/admin/users/${seeded.targetUserId}`, {
              method: 'POST',
              actor,
              body: { status: 'ACTIVE', reason: 'RBAC verification check' },
            }),
            { params: Promise.resolve({ id: seeded.targetUserId }) }
          ),
      },

      // Business endpoints
      {
        name: 'GET /api/business/dashboard',
        allowedRole: 'BUSINESS',
        invoke: (actor) =>
          businessDashboardGet(buildRequest('/api/business/dashboard', { actor })),
      },
      {
        name: 'GET /api/business/products',
        allowedRole: 'BUSINESS',
        invoke: (actor) =>
          businessProductsGet(buildRequest('/api/business/products', { actor })),
      },
      {
        name: 'GET /api/business/enrollments',
        allowedRole: 'BUSINESS',
        invoke: (actor) =>
          businessEnrollmentsGet(buildRequest('/api/business/enrollments', { actor })),
      },
      {
        name: 'GET /api/business/sales',
        allowedRole: 'BUSINESS',
        invoke: (actor) => businessSalesGet(buildRequest('/api/business/sales', { actor })),
      },
      {
        name: 'POST /api/business/sales',
        allowedRole: 'BUSINESS',
        invoke: (actor) =>
          businessSalesPost(
            buildRequest('/api/business/sales', {
              method: 'POST',
              actor,
              body: { promoCode: 'GLOW-ANANYA', quantity: 1, dryRun: true },
            })
          ),
      },
      {
        name: 'GET /api/business/wallet',
        allowedRole: 'BUSINESS',
        invoke: (actor) => businessWalletGet(buildRequest('/api/business/wallet', { actor })),
      },
      {
        name: 'POST /api/business/wallet',
        allowedRole: 'BUSINESS',
        invoke: (actor) =>
          businessWalletPost(
            buildRequest('/api/business/wallet', {
              method: 'POST',
              actor,
              body: { amountRupees: 1000, paymentMethod: 'UPI', reference: 'RBAC-TOPUP' },
            })
          ),
      },
      {
        name: 'GET /api/business/profile',
        allowedRole: 'BUSINESS',
        invoke: (actor) => businessProfileGet(buildRequest('/api/business/profile', { actor })),
      },
      {
        name: 'PATCH /api/business/profile',
        allowedRole: 'BUSINESS',
        invoke: (actor) =>
          businessProfilePatch(
            buildRequest('/api/business/profile', {
              method: 'PATCH',
              actor,
              body: {
                brandName: 'Glow Wellness Studio',
                description: 'Updated studio description for RBAC verification.',
                city: 'Bhubaneswar',
              },
            })
          ),
      },
      {
        name: 'POST /api/business/integrations/rotate',
        allowedRole: 'BUSINESS',
        invoke: (actor) =>
          businessIntegrationsRotatePost(
            buildRequest('/api/business/integrations/rotate', { method: 'POST', actor })
          ),
      },

      // Creator / Influencer endpoints
      {
        name: 'GET /api/influencer/dashboard',
        allowedRole: 'INFLUENCER',
        invoke: (actor) =>
          influencerDashboardGet(buildRequest('/api/influencer/dashboard', { actor })),
      },
      {
        name: 'GET /api/influencer/enrollments',
        allowedRole: 'INFLUENCER',
        invoke: (actor) =>
          influencerEnrollmentsGet(buildRequest('/api/influencer/enrollments', { actor })),
      },
      {
        name: 'POST /api/influencer/enrollments',
        allowedRole: 'INFLUENCER',
        invoke: (actor) =>
          influencerEnrollmentsPost(
            buildRequest('/api/influencer/enrollments', {
              method: 'POST',
              actor,
              body: {
                productId: seeded.product2Id,
                pitchNote: 'Creator campaign pitch for aromatherapy spa.',
              },
            })
          ),
      },
      {
        name: 'POST /api/influencer/payouts',
        allowedRole: 'INFLUENCER',
        invoke: (actor) =>
          influencerPayoutsPost(
            buildRequest('/api/influencer/payouts', {
              method: 'POST',
              actor,
              body: { amountRupees: 200, note: 'RBAC payout request' },
            })
          ),
      },
      {
        name: 'GET /api/influencer/profile',
        allowedRole: 'INFLUENCER',
        invoke: (actor) =>
          influencerProfileGet(buildRequest('/api/influencer/profile', { actor })),
      },
      {
        name: 'PATCH /api/influencer/profile',
        allowedRole: 'INFLUENCER',
        invoke: (actor) =>
          influencerProfilePatch(
            buildRequest('/api/influencer/profile', {
              method: 'PATCH',
              actor,
              body: {
                displayName: 'Ananya Creator',
                bio: 'Updated creator bio for RBAC verification check.',
                niche: 'Wellness',
                followerCount: 15000,
                upiId: 'ananya@okaxis',
              },
            })
          ),
      },

      // Customer endpoints
      {
        name: 'GET /api/customer/dashboard',
        allowedRole: 'CUSTOMER',
        invoke: (actor) =>
          customerDashboardGet(buildRequest('/api/customer/dashboard', { actor })),
      },
      {
        name: 'GET /api/customer/profile',
        allowedRole: 'CUSTOMER',
        invoke: (actor) => customerProfileGet(buildRequest('/api/customer/profile', { actor })),
      },
      {
        name: 'PATCH /api/customer/profile',
        allowedRole: 'CUSTOMER',
        invoke: (actor) =>
          customerProfilePatch(
            buildRequest('/api/customer/profile', {
              method: 'PATCH',
              actor,
              body: { displayName: 'Priya Customer', city: 'Cuttack' },
            })
          ),
      },
      {
        name: 'GET /api/customer/request',
        allowedRole: 'CUSTOMER',
        invoke: (actor) => customerRequestGet(buildRequest('/api/customer/request', { actor })),
      },
      {
        name: 'POST /api/customer/request',
        allowedRole: 'CUSTOMER',
        invoke: (actor) =>
          customerRequestPost(
            buildRequest('/api/customer/request', {
              method: 'POST',
              actor,
              body: {
                productId: seeded.productId,
                categoryHint: 'wellness',
                pitchNote: 'Looking for an evening wellness slot this weekend.',
                budgetRupees: 1500,
              },
            })
          ),
      },
      {
        name: 'GET /api/customer/passport',
        allowedRole: 'CUSTOMER',
        invoke: (actor) =>
          customerPassportGet(buildRequest('/api/customer/passport', { actor })),
      },
      {
        name: 'POST /api/customer/passport',
        allowedRole: 'CUSTOMER',
        invoke: (actor) =>
          customerPassportPost(
            buildRequest('/api/customer/passport', {
              method: 'POST',
              actor,
              body: { productId: seeded.productId },
            })
          ),
      },
      {
        name: 'PATCH /api/customer/interests',
        allowedRole: 'CUSTOMER',
        invoke: (actor) =>
          customerInterestsPatch(
            buildRequest('/api/customer/interests', {
              method: 'PATCH',
              actor,
              body: { interests: ['Wellness', 'Spa'] },
            })
          ),
      },
      {
        name: 'GET /api/customer/offers',
        allowedRole: 'CUSTOMER',
        invoke: (actor) => customerOffersGet(buildRequest('/api/customer/offers', { actor })),
      },
      {
        name: 'GET /api/customer/recommendations',
        allowedRole: 'CUSTOMER',
        invoke: (actor) =>
          customerRecommendationsGet(
            buildRequest('/api/customer/recommendations', { actor })
          ),
      },

      // Shared authenticated endpoints
      {
        name: 'GET /api/auth/sessions',
        allowedRole: 'ANY_AUTH',
        invoke: (actor) => authSessionsGet(buildRequest('/api/auth/sessions', { actor })),
      },
      {
        name: 'DELETE /api/auth/sessions',
        allowedRole: 'ANY_AUTH',
        invoke: (actor) =>
          authSessionsDelete(
            buildRequest('/api/auth/sessions', { method: 'DELETE', actor })
          ),
      },
      {
        name: 'POST /api/auth/mfa/enroll',
        allowedRole: 'ANY_AUTH',
        invoke: (actor) =>
          authMfaEnrollPost(buildRequest('/api/auth/mfa/enroll', { method: 'POST', actor })),
      },
      {
        name: 'GET /api/notifications',
        allowedRole: 'ANY_AUTH',
        invoke: (actor) => notificationsGet(buildRequest('/api/notifications', { actor })),
      },
      {
        name: 'PATCH /api/notifications',
        allowedRole: 'ANY_AUTH',
        invoke: (actor) =>
          notificationsPatch(
            buildRequest('/api/notifications', { method: 'PATCH', actor, body: {} })
          ),
      },
    ];

    const actorOrder: Array<{ key: ActorKey; role: string }> = [
      { key: 'unauthenticated', role: 'NONE' },
      { key: 'invalidToken', role: 'NONE' },
      { key: 'revoked', role: 'NONE' },
      { key: 'suspended', role: 'SUSPENDED' },
      { key: 'customer', role: 'CUSTOMER' },
      { key: 'influencer', role: 'INFLUENCER' },
      { key: 'business', role: 'BUSINESS' },
      { key: 'admin', role: 'ADMIN' },
    ];

    for (const endpoint of endpoints) {
      for (const actorEntry of actorOrder) {
        const res = await endpoint.invoke(seeded.actors[actorEntry.key]);

        if (actorEntry.role === 'NONE' || actorEntry.role === 'SUSPENDED') {
          expect(res.status, `${endpoint.name} as ${actorEntry.key}`).toBe(401);
          expect(await readErrorCode(res)).toBe('UNAUTHENTICATED');
        } else if (
          endpoint.allowedRole === 'ANY_AUTH' ||
          endpoint.allowedRole === actorEntry.role
        ) {
          expect(
            res.status,
            `${endpoint.name} as allowed ${actorEntry.key}`
          ).toBeLessThan(300);
        } else {
          expect(res.status, `${endpoint.name} as forbidden ${actorEntry.key}`).toBe(403);
          expect(await readErrorCode(res)).toBe('FORBIDDEN');
        }
      }
    }

    // Suspended user cannot log in (403 ACCOUNT_SUSPENDED)
    const suspendedLoginRes = await authLoginPost(
      buildRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'suspended.rbac@test.local', password: 'Password123!' },
      })
    );
    expect(suspendedLoginRes.status).toBe(403);
    expect(await readErrorCode(suspendedLoginRes)).toBe('ACCOUNT_SUSPENDED');

    // Also verify cron endpoint rejects non-admin roles & unauthenticated calls with 403, and allows admin / x-cron-secret
    for (const deniedKey of ['unauthenticated', 'customer', 'influencer', 'business'] as const) {
      const res = await cronHousekeepingPost(
        buildRequest('/api/cron/housekeeping', {
          method: 'POST',
          actor: seeded.actors[deniedKey],
        })
      );
      expect(res.status).toBe(403);
      expect(await readErrorCode(res)).toBe('FORBIDDEN');
    }

    const adminCronRes = await cronHousekeepingPost(
      buildRequest('/api/cron/housekeeping', {
        method: 'POST',
        actor: seeded.actors.admin,
      })
    );
    expect(adminCronRes.status).toBe(200);

    const secretCronRes = await cronHousekeepingPost(
      buildRequest('/api/cron/housekeeping', {
        method: 'POST',
        headers: { 'x-cron-secret': process.env.CRON_SECRET! },
      })
    );
    expect(secretCronRes.status).toBe(200);

    // Verify /api/auth/me returns null for unauthenticated and supports Bearer token
    const meAnon = await authMeGet(buildRequest('/api/auth/me'));
    expect(meAnon.status).toBe(200);
    expect(((await meAnon.json()) as { actor: unknown }).actor).toBeNull();

    const bearerDash = await businessDashboardGet(
      buildRequest('/api/business/dashboard', {
        actor: { bearerToken: seeded.actors.business.cookieValue },
      })
    );
    expect(bearerDash.status).toBe(200);
  });

  it('blocks cross-tenant IDOR access between businesses and between creators', async () => {
    const db = getDb();
    const [cat] = await db.insert(categories).values({ name: 'Fitness', slug: 'fitness' }).returning();

    const bizA = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Business A',
      handleOrSlug: 'business-a-idor',
      email: 'biza.idor@test.local',
      password: 'Password123!',
    });
    const bizB = await registerAccount({
      role: 'BUSINESS',
      displayName: 'Business B',
      handleOrSlug: 'business-b-idor',
      email: 'bizb.idor@test.local',
      password: 'Password123!',
    });
    const infA = await registerAccount({
      role: 'INFLUENCER',
      displayName: 'Creator A',
      handleOrSlug: 'creator-a-idor',
      email: 'infa.idor@test.local',
      password: 'Password123!',
    });
    const infB = await registerAccount({
      role: 'INFLUENCER',
      displayName: 'Creator B',
      handleOrSlug: 'creator-b-idor',
      email: 'infb.idor@test.local',
      password: 'Password123!',
    });

    const [bizAProfile] = await db.query.businessProfiles.findMany({
      where: (t, { eq: eqCol }) => eqCol(t.userId, bizA.user.id),
      limit: 1,
    });
    const [infAProfile] = await db.query.influencerProfiles.findMany({
      where: (t, { eq: eqCol }) => eqCol(t.userId, infA.user.id),
      limit: 1,
    });

    await updateInfluencerProfileDetails(infAProfile!.id, infA.user.id, {
      displayName: 'Creator A',
      bio: 'Verified creator account for IDOR isolation verification.',
      niche: 'Fitness',
      followerCount: 8000,
      upiId: 'creatora@okicici',
    });

    await depositBrandWallet({
      businessId: bizAProfile!.id,
      actorUserId: bizA.user.id,
      rawInput: { amountRupees: 2000, paymentMethod: 'UPI' },
    });

    const prodA = await createBusinessProduct(bizAProfile!.id, bizA.user.id, {
      title: 'Yoga Trial Pass',
      categoryId: cat!.id,
      description: 'Single-day studio pass with guided morning yoga class.',
      retailPriceRupees: 800,
      commissionType: 'FIXED_PER_SALE',
      commissionFixedRupees: 300,
      buyerDiscountPercent: 10,
      promoCodePrefix: 'YOGA',
    });

    const enrollA = await applyForProductEnrollment(infAProfile!.id, infA.user.id, {
      productId: prodA.id,
      pitchNote: 'Will promote yoga trial pass.',
    });
    await decideEnrollmentByBusiness({
      enrollmentId: enrollA.id,
      businessId: bizAProfile!.id,
      actorUserId: bizA.user.id,
      rawInput: { action: 'APPROVE', customPromoCode: 'YOGA-CREATORA' },
    });

    const saleRes = await logOrPreviewPromoSale({
      businessId: bizAProfile!.id,
      actorUserId: bizA.user.id,
      source: 'MANUAL',
      rawInput: { promoCode: 'YOGA-CREATORA', quantity: 1, settlementMode: 'INSTANT' },
    });
    if (!saleRes.saleId) {
      throw new Error('Expected recorded saleId in IDOR setup');
    }

    const payoutA = await requestInfluencerPayout(infAProfile!.id, infA.user.id, {
      amountRupees: 200,
    });

    const bizBActor: ActorContext = { cookieValue: bizB.session.cookieValue };
    const infBActor: ActorContext = { cookieValue: infB.session.cookieValue };

    // Business B cannot read Business A's product
    const getProdRes = await businessProductByIdGet(
      buildRequest(`/api/business/products/${prodA.id}`, { actor: bizBActor }),
      { params: Promise.resolve({ id: prodA.id }) }
    );
    expect(getProdRes.status).toBe(403);

    // Business B cannot approve/pause Business A's enrollment
    const decEnrollRes = await businessEnrollmentDecidePost(
      buildRequest(`/api/business/enrollments/${enrollA.id}`, {
        method: 'POST',
        actor: bizBActor,
        body: { action: 'PAUSE' },
      }),
      { params: Promise.resolve({ id: enrollA.id }) }
    );
    expect(decEnrollRes.status).toBe(403);

    // Business B cannot resolve/refund Business A's promo sale
    const patchSaleRes = await businessSaleByIdPatch(
      buildRequest(`/api/business/sales/${saleRes.saleId}`, {
        method: 'PATCH',
        actor: bizBActor,
        body: { action: 'CONFIRM' },
      }),
      { params: Promise.resolve({ id: saleRes.saleId }) }
    );
    expect(patchSaleRes.status).toBe(403);

    // Influencer B cannot read Influencer A's payout receipt
    const payoutReceiptRes = await influencerPayoutReceiptGet(
      buildRequest(`/api/influencer/payouts/${payoutA.id}`, { actor: infBActor }),
      { params: Promise.resolve({ id: payoutA.id }) }
    );
    expect(payoutReceiptRes.status).toBe(403);
    expect(await readErrorCode(payoutReceiptRes)).toBe('FORBIDDEN');
  });

  it('enforces organisation and branch RBAC across all OrgRole levels in requireOrgRole', async () => {
    const db = getDb();

    const [orgA] = await db
      .insert(organisations)
      .values({ legalName: 'Glow Corp Pvt Ltd', tradeName: 'Glow Studio' })
      .returning();
    const [orgB] = await db
      .insert(organisations)
      .values({ legalName: 'Brew Corp Pvt Ltd', tradeName: 'Brew Roasters' })
      .returning();

    const [branchA1] = await db
      .insert(branches)
      .values({ organisationId: orgA!.id, name: 'Saheed Nagar' })
      .returning();
    const [branchA2] = await db
      .insert(branches)
      .values({ organisationId: orgA!.id, name: 'Patia' })
      .returning();
    const [branchB1] = await db
      .insert(branches)
      .values({ organisationId: orgB!.id, name: 'MG Road' })
      .returning();

    const rolesToTest: Array<{
      email: string;
      orgId: string;
      branchId: string | null;
      orgRole: OrgRole;
      status?: 'ACTIVE' | 'INACTIVE';
    }> = [
      {
        email: 'owner.orga@test.local',
        orgId: orgA!.id,
        branchId: null,
        orgRole: 'ORG_OWNER',
      },
      {
        email: 'manager.a1@test.local',
        orgId: orgA!.id,
        branchId: branchA1!.id,
        orgRole: 'BRANCH_MANAGER',
      },
      {
        email: 'staff.a1@test.local',
        orgId: orgA!.id,
        branchId: branchA1!.id,
        orgRole: 'STAFF',
      },
      {
        email: 'finance.orga@test.local',
        orgId: orgA!.id,
        branchId: null,
        orgRole: 'FINANCE',
      },
      {
        email: 'analyst.orga@test.local',
        orgId: orgA!.id,
        branchId: null,
        orgRole: 'READ_ONLY_ANALYST',
      },
      {
        email: 'revoked.member@test.local',
        orgId: orgA!.id,
        branchId: null,
        orgRole: 'ORG_OWNER',
        status: 'INACTIVE',
      },
    ];

    const sessionsByEmail: Record<string, string> = {};
    for (const item of rolesToTest) {
      const reg = await registerAccount({
        role: 'BUSINESS',
        displayName: item.email.split('@')[0]!,
        email: item.email,
        password: 'Password123!',
      });
      await db.insert(memberships).values({
        userId: reg.user.id,
        organisationId: item.orgId,
        branchId: item.branchId,
        orgRole: item.orgRole,
        status: item.status ?? 'ACTIVE',
      });
      sessionsByEmail[item.email] = reg.session.cookieValue;
    }

    const reqFor = (email: string) =>
      buildRequest('/api/business/dashboard', {
        actor: { cookieValue: sessionsByEmail[email] },
      });

    // Org-wide ORG_OWNER passes for org-wide & any branch in Org A, fails for Org B
    await expect(
      requireOrgRole(['ORG_OWNER'], orgA!.id, null, reqFor('owner.orga@test.local'))
    ).resolves.toBeDefined();
    await expect(
      requireOrgRole(['ORG_OWNER'], orgA!.id, branchA2!.id, reqFor('owner.orga@test.local'))
    ).resolves.toBeDefined();
    await expect(
      requireOrgRole(['ORG_OWNER'], orgB!.id, branchB1!.id, reqFor('owner.orga@test.local'))
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' } satisfies Partial<AppError>);

    // Branch-scoped BRANCH_MANAGER passes for Branch A1, fails for Branch A2 & org-wide
    await expect(
      requireOrgRole(
        ['ORG_OWNER', 'BRANCH_MANAGER'],
        orgA!.id,
        branchA1!.id,
        reqFor('manager.a1@test.local')
      )
    ).resolves.toBeDefined();
    await expect(
      requireOrgRole(
        ['ORG_OWNER', 'BRANCH_MANAGER'],
        orgA!.id,
        branchA2!.id,
        reqFor('manager.a1@test.local')
      )
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    await expect(
      requireOrgRole(
        ['ORG_OWNER', 'BRANCH_MANAGER'],
        orgA!.id,
        null,
        reqFor('manager.a1@test.local')
      )
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

    // STAFF cannot invoke FINANCE/ORG_OWNER actions; FINANCE cannot invoke STAFF actions; READ_ONLY_ANALYST cannot mutate
    await expect(
      requireOrgRole(['ORG_OWNER', 'FINANCE'], orgA!.id, branchA1!.id, reqFor('staff.a1@test.local'))
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    await expect(
      requireOrgRole(['FINANCE'], orgA!.id, null, reqFor('finance.orga@test.local'))
    ).resolves.toBeDefined();
    await expect(
      requireOrgRole(['ORG_OWNER', 'STAFF'], orgA!.id, branchA1!.id, reqFor('analyst.orga@test.local'))
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

    // Inactive membership is rejected with 403
    await expect(
      requireOrgRole(['ORG_OWNER'], orgA!.id, null, reqFor('revoked.member@test.local'))
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });

    // Unauthenticated request gets 401
    await expect(
      requireOrgRole(['ORG_OWNER'], orgA!.id, null, buildRequest('/api/business/dashboard'))
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });

    // Platform ADMIN passes requireOrgRole across organisations
    await db.insert(users).values({
      email: 'superadmin.org@test.local',
      passwordHash: await hashPassword('AdminPass123!'),
      displayName: 'Super Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    const adminLogin = await loginUser({
      email: 'superadmin.org@test.local',
      password: 'AdminPass123!',
    });
    await expect(
      requireOrgRole(
        ['ORG_OWNER'],
        orgB!.id,
        branchB1!.id,
        buildRequest('/api/business/dashboard', {
          actor: { cookieValue: adminLogin.session.cookieValue },
        })
      )
    ).resolves.toBeDefined();
  });

  it('verifies Phone OTP, TOTP MFA, account lockout, and CSRF origin rejection via HTTP routes', async () => {
    const db = getDb();
    const reg = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Auth Hardening User',
      email: 'hardening.rbac@test.local',
      password: 'Password123!',
    });
    const actor: ActorContext = { cookieValue: reg.session.cookieValue };

    // 1. Phone OTP HTTP flow + 5-attempt limit + expiry check
    const otpReqRes = await authOtpRequestPost(
      buildRequest('/api/auth/otp/request', {
        method: 'POST',
        actor,
        body: { phone: '+919811122233' },
      })
    );
    expect(otpReqRes.status).toBe(201);
    const otpReqJson = (await otpReqRes.json()) as { challengeId: string; devCode: string };
    expect(otpReqJson.devCode).toMatch(/^\d{6}$/);

    for (let i = 0; i < 5; i++) {
      const badVerify = await authOtpVerifyPost(
        buildRequest('/api/auth/otp/verify', {
          method: 'POST',
          body: { phone: '+919811122233', code: '000000' },
        })
      );
      expect(badVerify.status).toBe(400);
    }

    const lockedOtp = await authOtpVerifyPost(
      buildRequest('/api/auth/otp/verify', {
        method: 'POST',
        body: { phone: '+919811122233', code: otpReqJson.devCode },
      })
    );
    expect(lockedOtp.status).toBe(429);
    expect(await readErrorCode(lockedOtp)).toBe('OTP_MAX_ATTEMPTS');

    // Expired OTP returns 400 OTP_EXPIRED
    const otpReq2 = await authOtpRequestPost(
      buildRequest('/api/auth/otp/request', {
        method: 'POST',
        actor,
        body: { phone: '+919811122244' },
      })
    );
    const otp2Json = (await otpReq2.json()) as { challengeId: string; devCode: string };
    await db
      .update(otpChallenges)
      .set({ expiresAt: new Date(Date.now() - 60_000).toISOString() })
      .where(eq(otpChallenges.id, otp2Json.challengeId));

    const expiredRes = await authOtpVerifyPost(
      buildRequest('/api/auth/otp/verify', {
        method: 'POST',
        body: { phone: '+919811122244', code: otp2Json.devCode },
      })
    );
    expect(expiredRes.status).toBe(400);
    expect(await readErrorCode(expiredRes)).toBe('OTP_EXPIRED');

    // 2. TOTP MFA HTTP enroll + verify
    const enrollRes = await authMfaEnrollPost(
      buildRequest('/api/auth/mfa/enroll', { method: 'POST', actor })
    );
    expect(enrollRes.status).toBe(201);
    const enrollJson = (await enrollRes.json()) as { secret: string; otpauthUri: string };
    expect(enrollJson.otpauthUri).toContain('otpauth://totp/');

    const badMfaRes = await authMfaVerifyPost(
      buildRequest('/api/auth/mfa/verify', {
        method: 'POST',
        actor,
        body: { code: '000000' },
      })
    );
    // Guard against the 1-in-1,000,000 chance 000000 matches current window
    if (generateTotpCode(enrollJson.secret) !== '000000') {
      expect(badMfaRes.status).toBe(401);
      expect(await readErrorCode(badMfaRes)).toBe('INVALID_MFA_CODE');
    }

    const validMfaRes = await authMfaVerifyPost(
      buildRequest('/api/auth/mfa/verify', {
        method: 'POST',
        actor,
        body: { code: generateTotpCode(enrollJson.secret) },
      })
    );
    expect(validMfaRes.status).toBe(200);
    expect(((await validMfaRes.json()) as { mfaEnabled: boolean }).mfaEnabled).toBe(true);

    // 3. Account lockout via POST /api/auth/login (5 failures -> 423 ACCOUNT_LOCKED)
    for (let i = 0; i < 4; i++) {
      const failLogin = await authLoginPost(
        buildRequest('/api/auth/login', {
          method: 'POST',
          body: { email: 'hardening.rbac@test.local', password: 'WrongPassword!' },
        })
      );
      expect(failLogin.status).toBe(401);
      expect(await readErrorCode(failLogin)).toBe('INVALID_CREDENTIALS');
    }

    const lockLogin = await authLoginPost(
      buildRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'hardening.rbac@test.local', password: 'WrongPassword!' },
      })
    );
    expect(lockLogin.status).toBe(423);
    expect(await readErrorCode(lockLogin)).toBe('ACCOUNT_LOCKED');

    // Correct password is also rejected while account is locked
    const lockedEvenValid = await authLoginPost(
      buildRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'hardening.rbac@test.local', password: 'Password123!' },
      })
    );
    expect(lockedEvenValid.status).toBe(423);
    expect(await readErrorCode(lockedEvenValid)).toBe('ACCOUNT_LOCKED');

    // 4. CSRF / untrusted Origin blocked with 403 CSRF_REJECTED
    const csrfRes = await customerProfilePatch(
      buildRequest('/api/customer/profile', {
        method: 'PATCH',
        actor,
        origin: 'https://evil.example',
        body: { displayName: 'CSRF Hijack', city: 'Mumbai' },
      })
    );
    expect(csrfRes.status).toBe(403);
    expect(await readErrorCode(csrfRes)).toBe('CSRF_REJECTED');
  });
});
