import { beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '@/server/db';
import { categories } from '@/server/db/schema';
import { resolveActorFromCookieValue } from '@/server/auth/session';
import { registerAccount } from '@/server/services/auth.service';
import { createBusinessProduct } from '@/server/services/marketplace.service';
import {
  createCustomerRequest,
  getCustomerProfileDetails,
  listCustomerRequests,
  listPassportItems,
  removeOfferFromPassport,
  saveOfferToPassport,
  updateCustomerInterests,
  updateCustomerProfileDetails,
} from '@/server/services/customer.service';
import {
  getHydratedPassport,
  getProofBasedRecommendations,
  matchOffersForCustomer,
} from '@/server/services/customerDiscovery.service';
import { truncateAllTables } from '../setup';

describe('Integration: Customer Need-to-Offer, Passport & Requests', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  async function seed() {
    const db = getDb();
    const [cat] = await db
      .insert(categories)
      .values({ name: 'Skincare', slug: 'skincare' })
      .returning();

    const bizReg = await registerAccount({
      role: 'BUSINESS',
      displayName: 'PureGlow Labs',
      handleOrSlug: 'pureglow-labs',
      email: 'biz.customer.test@example.com',
      password: 'Password123!',
      city: 'Bhubaneswar',
    });
    const bizActor = (await resolveActorFromCookieValue(bizReg.session.cookieValue))!;

    const customerReg = await registerAccount({
      role: 'CUSTOMER',
      displayName: 'Ananya Customer',
      email: 'customer.journey@example.com',
      password: 'Password123!',
      city: 'Bhubaneswar',
    });
    const customerActor = (await resolveActorFromCookieValue(
      customerReg.session.cookieValue
    ))!;

    const product = await createBusinessProduct(
      bizActor.businessProfile!.id,
      bizActor.user.id,
      {
        title: 'Hydra Barrier Cream',
        categoryId: cat!.id,
        description: 'Ceramide barrier moisturizer for daily skincare routines.',
        retailPriceRupees: 1000,
        commissionType: 'FIXED_PER_SALE',
        commissionFixedRupees: 200,
        buyerDiscountPercent: 10,
        promoCodePrefix: 'PURE',
      }
    );

    return { bizActor, customerActor, product, categoryId: cat!.id };
  }

  it('matches offers to a customer need using interests and city', async () => {
    const { customerActor, product } = await seed();

    await updateCustomerInterests(
      customerActor.customerProfile!.id,
      customerActor.user.id,
      ['skincare', 'moisturizer']
    );

    const matches = await matchOffersForCustomer(customerActor.customerProfile!.id, {
      limit: 5,
    });

    expect(matches.length).toBeGreaterThan(0);
    const target = matches.find((m) => m.id === product.id);
    expect(target).toBeTruthy();
    expect(target!.matchScore).toBeGreaterThan(0);
    expect(target!.matchReasons.some((r) => r.includes('interest'))).toBe(true);
    expect(target!.discountedPricePaise).toBe(90000);
    expect(typeof target!.verifiedSalesCount).toBe('number');
    expect(typeof target!.verifiedClicksCount).toBe('number');
  });

  it('saves offers to the Value Passport and hydrates live pricing', async () => {
    const { customerActor, product } = await seed();

    await saveOfferToPassport(
      customerActor.customerProfile!.id,
      customerActor.user.id,
      product.id
    );

    const prefs = await listPassportItems(customerActor.customerProfile!.id);
    expect(prefs.savedOffers).toContain(product.id);

    const passport = await getHydratedPassport(customerActor.customerProfile!.id);
    expect(passport.savedOffers).toHaveLength(1);
    expect(passport.savedOffers[0].id).toBe(product.id);
    expect(passport.savedOffers[0].discountedPricePaise).toBe(90000);

    await removeOfferFromPassport(
      customerActor.customerProfile!.id,
      customerActor.user.id,
      product.id
    );
    const after = await getHydratedPassport(customerActor.customerProfile!.id);
    expect(after.savedOffers).toHaveLength(0);
  });

  it('creates customer requests without wiping saved offers', async () => {
    const { customerActor, product } = await seed();

    await saveOfferToPassport(
      customerActor.customerProfile!.id,
      customerActor.user.id,
      product.id
    );

    const request = await createCustomerRequest(
      customerActor.customerProfile!.id,
      customerActor.user.id,
      {
        productId: product.id,
        pitchNote: 'I want a winter skincare bundle under ₹1000.',
        interestTags: ['skincare', 'winter'],
        budgetRupees: 1000,
      }
    );
    expect(request.status).toBe('OPEN');

    const requests = await listCustomerRequests(customerActor.customerProfile!.id);
    expect(requests).toHaveLength(1);
    expect((requests[0] as { productId?: string }).productId).toBe(product.id);

    // Updating profile interests must not erase passport or requests
    await updateCustomerProfileDetails(
      customerActor.customerProfile!.id,
      customerActor.user.id,
      {
        displayName: 'Ananya Customer',
        city: 'Bhubaneswar',
        preferences: JSON.stringify({ interests: ['skincare', 'cafes'] }),
      }
    );

    const prefs = await listPassportItems(customerActor.customerProfile!.id);
    expect(prefs.savedOffers).toContain(product.id);
    expect(prefs.requests).toHaveLength(1);
    expect(prefs.interests).toEqual(['skincare', 'cafes']);
  });

  it('returns proof-based recommendations with concrete reasons', async () => {
    const { customerActor } = await seed();

    await updateCustomerInterests(
      customerActor.customerProfile!.id,
      customerActor.user.id,
      ['skincare']
    );

    const recs = await getProofBasedRecommendations(
      customerActor.customerProfile!.id,
      6
    );
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].matchReasons.length).toBeGreaterThan(0);
  });

  it('rejects invalid request payloads', async () => {
    const { customerActor } = await seed();

    await expect(
      createCustomerRequest(customerActor.customerProfile!.id, customerActor.user.id, {
        pitchNote: 'hi',
      })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
  });
});

