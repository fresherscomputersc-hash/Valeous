import { inArray, sql } from 'drizzle-orm';
import { getDb } from '@/server/db';
import { enrollments } from '@/server/db/schema';
import {
  listMarketplaceProducts,
  computeEstimatedCommissionPerUnitPaise,
} from '@/server/services/marketplace.service';
import {
  getCustomerProfileDetails,
  listPassportItems,
} from '@/server/services/customer.service';

interface CustomerOfferMatch {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string | null;
  externalProductUrl: string | null;
  retailPricePaise: number;
  discountedPricePaise: number;
  commissionType: string;
  commissionFixedPaise: number | null;
  commissionPercent: number | null;
  buyerDiscountPercent: number;
  promoCodePrefix: string | null;
  categoryName: string;
  categorySlug: string;
  businessId: string;
  brandName: string;
  businessSlug: string;
  businessCity: string;
  activeInfluencersCount: number;
  estimatedUnitCommissionPaise: number;
  verifiedSalesCount: number;
  verifiedClicksCount: number;
  matchScore: number;
  matchReasons: string[];
}

interface MatchFilters {
  q?: string;
  categorySlug?: string;
  commissionType?: string;
  sort?: string;
  limit?: number;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

interface CustomerPreferences {
  interests?: unknown;
  savedOffers?: unknown;
  requests?: unknown;
  [key: string]: unknown;
}

function tokenizeInterests(preferences: CustomerPreferences): string[] {
  const raw = preferences.interests;
  if (Array.isArray(raw)) {
    return raw.map((s: unknown) => normalize(String(s))).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw
      .split(/[,;]+/)
      .map((s) => normalize(s))
      .filter(Boolean);
  }
  return [];
}

/**
 * Need-to-Offer Matching.
 * Scores ACTIVE marketplace products against the customer's stated interests,
 * city, discount presence, and social-proof signals (active creator count).
 */
export async function matchOffersForCustomer(
  customerId: string,
  filters: MatchFilters = {}
): Promise<CustomerOfferMatch[]> {
  const profile = await getCustomerProfileDetails(customerId);
  const interests = (profile.interests ?? []).map(normalize).filter(Boolean);
  const customerCity = normalize(profile.city || '');

  const products = await listMarketplaceProducts({
    q: filters.q,
    categorySlug: filters.categorySlug,
    commissionType: filters.commissionType,
    sort: filters.sort,
  });

  // Outcome-Based Campaigns: attach verified creator outcomes per product.
  const proofByProduct = await getProductOutcomeProof(products.map((p) => p.id));

  const scored: CustomerOfferMatch[] = products.map((p) => {
    let score = 0;
    const reasons: string[] = [];

    const haystack = normalize(
      [p.title, p.description, p.categoryName, p.brandName].join(' ')
    );

    const matchedInterests = interests.filter((tag) => haystack.includes(tag));
    if (matchedInterests.length > 0) {
      score += Math.min(40, matchedInterests.length * 20);
      reasons.push(`Matches your interest: ${matchedInterests.slice(0, 3).join(', ')}`);
    }

    if (customerCity && p.businessCity && normalize(p.businessCity) === customerCity) {
      score += 20;
      reasons.push(`Local brand in ${p.businessCity}`);
    }

    if (p.buyerDiscountPercent > 0) {
      score += 10;
      reasons.push(`Save ${p.buyerDiscountPercent}% at checkout`);
    }

    if (p.activeInfluencersCount >= 1) {
      score += 10;
      reasons.push(
        `${p.activeInfluencersCount} creator${p.activeInfluencersCount === 1 ? '' : 's'} promoting`
      );
    }
    if (p.activeInfluencersCount >= 3) {
      score += 5;
      reasons.push('Popular with the community');
    }

    const proof = proofByProduct.get(p.id);
    if (proof && proof.verifiedSalesCount > 0) {
      score += Math.min(15, proof.verifiedSalesCount);
      reasons.push(
        `${proof.verifiedSalesCount} verified sale${proof.verifiedSalesCount === 1 ? '' : 's'} through creators`
      );
    }

    const discountedPricePaise = Math.round(
      (p.retailPricePaise * (100 - p.buyerDiscountPercent)) / 100
    );

    return {
      ...p,
      discountedPricePaise,
      verifiedSalesCount: proof?.verifiedSalesCount ?? 0,
      verifiedClicksCount: proof?.verifiedClicksCount ?? 0,
      estimatedUnitCommissionPaise: computeEstimatedCommissionPerUnitPaise(
        p as {
          commissionType: 'PERCENTAGE' | 'FIXED_PER_SALE';
          commissionFixedPaise: number | null;
          commissionPercent: number | null;
          buyerDiscountPercent: number;
          retailPricePaise: number;
        }
      ),
      matchScore: score,
      matchReasons: reasons,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  const limit = Math.min(24, Math.max(1, filters.limit ?? 12));
  return scored.slice(0, limit);
}

/**
 * Proof-Based Recommendations.
 * Recommends offers that carry verifiable social proof: active creator
 * participation, buyer discounts, and interest alignment. Intentionally
 * excludes products with zero proof signals so every recommendation has a
 * concrete reason attached.
 */
export async function getProofBasedRecommendations(
  customerId: string,
  limit = 6
): Promise<CustomerOfferMatch[]> {
  const matches = await matchOffersForCustomer(customerId, { limit: 24 });

  const proofBacked = matches.filter(
    (m) =>
      m.activeInfluencersCount > 0 ||
      m.verifiedSalesCount > 0 ||
      m.buyerDiscountPercent > 0 ||
      m.matchReasons.some((r) => r.startsWith('Matches your interest'))
  );

  return proofBacked.slice(0, Math.min(12, Math.max(1, limit)));
}

/**
 * Smart Value Passport — hydrate saved product IDs into full offer details
 * so the customer sees current pricing and proof at a glance.
 */
export interface HydratedPassport {
  interests: string[];
  requests: unknown[];
  savedOffers: CustomerOfferMatch[];
}

export async function getHydratedPassport(
  customerId: string
): Promise<HydratedPassport> {
  const passport = await listPassportItems(customerId);
  const savedIds = passport.savedOffers;
  const requests = passport.requests;
  const normalizedInterests = passport.interests.map(normalize).filter(Boolean);

  if (savedIds.length === 0) {
    return {
      interests: normalizedInterests,
      requests,
      savedOffers: [],
    };
  }

  const all = await listMarketplaceProducts({});
  const byId = new Map(all.map((p) => [p.id, p]));
  const proofByProduct = await getProductOutcomeProof(all.map((p) => p.id));

  const savedOffers: CustomerOfferMatch[] = [];
  for (const id of savedIds) {
    const p = byId.get(id);
    if (!p) continue;
    const proof = proofByProduct.get(id);
    savedOffers.push({
      ...p,
      discountedPricePaise: Math.round(
        (p.retailPricePaise * (100 - p.buyerDiscountPercent)) / 100
      ),
      estimatedUnitCommissionPaise: computeEstimatedCommissionPerUnitPaise(
        p as {
          commissionType: 'PERCENTAGE' | 'FIXED_PER_SALE';
          commissionFixedPaise: number | null;
          commissionPercent: number | null;
          buyerDiscountPercent: number;
          retailPricePaise: number;
        }
      ),
      verifiedSalesCount: proof?.verifiedSalesCount ?? 0,
      verifiedClicksCount: proof?.verifiedClicksCount ?? 0,
      matchScore: 0,
      matchReasons: [],
    });
  }

  return {
    interests: normalizedInterests,
    requests,
    savedOffers,
  };
}

interface ProductOutcomeProof {
  verifiedSalesCount: number;
  verifiedClicksCount: number;
}

async function getProductOutcomeProof(
  productIds: string[]
): Promise<Map<string, ProductOutcomeProof>> {
  const map = new Map<string, ProductOutcomeProof>();
  if (productIds.length === 0) return map;

  const db = getDb();
  const rows = await db
    .select({
      productId: enrollments.productId,
      verifiedSalesCount: sql<number>`COALESCE(sum(${enrollments.totalSalesCount}), 0)`,
      verifiedClicksCount: sql<number>`COALESCE(sum(${enrollments.clicksCount}), 0)`,
    })
    .from(enrollments)
    .where(inArray(enrollments.productId, productIds))
    .groupBy(enrollments.productId);

  for (const row of rows) {
    map.set(row.productId, {
      verifiedSalesCount: Number(row.verifiedSalesCount) || 0,
      verifiedClicksCount: Number(row.verifiedClicksCount) || 0,
    });
  }
  return map;
}
