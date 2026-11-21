import { describe, expect, it } from 'vitest';
import { suggestSimplePromoCode } from '@/server/services/enrollment.service';
import {
  computePlatformFeePaise,
  computeSaleCommissionPaise,
} from '@/server/services/sales-wallet.service';
import {
  influencerProfileUpdateSchema,
  productInputSchema,
} from '@/server/validation/schemas';

describe('Unit: Promo code generation, commission & fee math, and KYC validation', () => {
  it('generates clean social-media-friendly promo codes', () => {
    expect(
      suggestSimplePromoCode({
        influencerHandle: 'ananya',
        promoCodePrefix: 'GLOW',
        buyerDiscountPercent: 10,
        commissionPercent: 20,
      })
    ).toBe('GLOW-ANANYA');

    expect(
      suggestSimplePromoCode({
        influencerHandle: 'rohan_vlogs',
        promoCodePrefix: null,
        buyerDiscountPercent: 15,
        commissionPercent: null,
      })
    ).toBe('ROHANVLO15');
  });

  it('computes fixed per-unit, percentage commissions, and platform fees accurately in paise', () => {
    expect(
      computeSaleCommissionPaise({
        commissionType: 'FIXED_PER_SALE',
        commissionFixedPaise: 18000,
        commissionPercent: null,
        quantity: 3,
        grossAmountPaise: 269700,
      })
    ).toBe(54000);

    expect(
      computeSaleCommissionPaise({
        commissionType: 'PERCENTAGE',
        commissionFixedPaise: null,
        commissionPercent: 20,
        quantity: 2,
        grossAmountPaise: 233800,
      })
    ).toBe(46760);

    // 10% platform fee on ₹540 commission = ₹54 (5400 paise)
    expect(computePlatformFeePaise(54000)).toBe(5400);
  });

  it('rejects fixed commission higher than or equal to retail product price', () => {
    const invalid = productInputSchema.safeParse({
      title: 'Invalid Payout Product',
      categoryId: '11111111-1111-4111-8111-111111111111',
      description: 'Valid product description text over fifteen characters.',
      retailPriceRupees: 500,
      commissionType: 'FIXED_PER_SALE',
      commissionFixedRupees: 600,
      buyerDiscountPercent: 0,
    });
    expect(invalid.success).toBe(false);
  });

  it('validates Indian UPI VPA, IFSC, and PAN formats strictly', () => {
    const validKyc = influencerProfileUpdateSchema.safeParse({
      displayName: 'Ananya Verma',
      bio: 'Clean skincare and wellness creator sharing honest product tests.',
      niche: 'Beauty',
      followerCount: 50000,
      upiId: 'ananya.verma@okicici',
      bankAccountNumber: '918273645501',
      bankIfsc: 'HDFC0001234',
      panNumber: 'ABCDE1234F',
    });
    expect(validKyc.success).toBe(true);

    const badIfsc = influencerProfileUpdateSchema.safeParse({
      displayName: 'Ananya Verma',
      bio: 'Clean skincare and wellness creator sharing honest product tests.',
      niche: 'Beauty',
      followerCount: 50000,
      upiId: 'ananya.verma@okicici',
      bankIfsc: 'BADIFSC',
    });
    expect(badIfsc.success).toBe(false);
  });
});
