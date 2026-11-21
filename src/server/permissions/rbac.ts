import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import { AppError } from '@/lib/errors';
import {
  getCurrentActor,
  resolveActorFromRequest,
  type AuthenticatedActor,
} from '@/server/auth/session';

export async function requireActor(request?: NextRequest): Promise<AuthenticatedActor> {
  const actor = request
    ? await resolveActorFromRequest(request)
    : await getCurrentActor();

  if (!actor) {
    if (!request) {
      redirect('/login');
    }
    throw new AppError('UNAUTHENTICATED', 'Please sign in to continue.', 401);
  }

  if (actor.user.status !== 'ACTIVE') {
    if (!request) {
      redirect('/login');
    }
    throw new AppError('ACCOUNT_SUSPENDED', 'Your account is currently suspended.', 403);
  }

  return actor;
}

export async function requireBusiness(request?: NextRequest): Promise<
  AuthenticatedActor & {
    businessProfile: NonNullable<AuthenticatedActor['businessProfile']>;
  }
> {
  const actor = await requireActor(request);
  if (actor.user.role !== 'BUSINESS' || !actor.businessProfile) {
    if (!request) {
      redirect('/');
    }
    throw new AppError('FORBIDDEN', 'Business account access is required.', 403);
  }
  return actor as AuthenticatedActor & {
    businessProfile: NonNullable<AuthenticatedActor['businessProfile']>;
  };
}

export async function requireInfluencer(request?: NextRequest): Promise<
  AuthenticatedActor & {
    influencerProfile: NonNullable<AuthenticatedActor['influencerProfile']>;
  }
> {
  const actor = await requireActor(request);
  if (actor.user.role !== 'INFLUENCER' || !actor.influencerProfile) {
    if (!request) {
      redirect('/');
    }
    throw new AppError('FORBIDDEN', 'Influencer account access is required.', 403);
  }
  return actor as AuthenticatedActor & {
    influencerProfile: NonNullable<AuthenticatedActor['influencerProfile']>;
  };
}

export async function requireCustomer(request?: NextRequest): Promise<
  AuthenticatedActor & {
    customerProfile: NonNullable<AuthenticatedActor['customerProfile']>;
  }
> {
  const actor = await requireActor(request);
  if (actor.user.role !== 'CUSTOMER' || !actor.customerProfile) {
    if (!request) {
      redirect('/');
    }
    throw new AppError('FORBIDDEN', 'Customer account access is required.', 403);
  }
  return actor as AuthenticatedActor & {
    customerProfile: NonNullable<AuthenticatedActor['customerProfile']>;
  };
}

export async function requireAdmin(request?: NextRequest): Promise<AuthenticatedActor> {
  const actor = await requireActor(request);
  if (actor.user.role !== 'ADMIN') {
    if (!request) {
      redirect('/');
    }
    throw new AppError('FORBIDDEN', 'Administrator permissions are required.', 403);
  }
  return actor;
}
