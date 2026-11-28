import { z } from 'zod';

const optionalHttpUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) =>
      !v ||
      /^https?:\/\//i.test(v) ||
      v.startsWith('/api/media/') ||
      v.startsWith('data:image/'),
    'Must be a valid http(s) URL or uploaded media path'
  )
  .optional()
  .or(z.literal(''));

export const UPI_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const registerSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(160),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  displayName: z.string().trim().min(2, 'Enter your name or brand name').max(80),
  role: z.enum(['INFLUENCER', 'BUSINESS', 'CUSTOMER']),
  handleOrSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/,
      'Use 3–40 lowercase letters, numbers, or hyphens'
    )
    .optional(),
  city: z.string().trim().min(2).max(60).optional(),
  niche: z.string().trim().min(2).max(80).optional(),
});

export const customerProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(60),
  preferences: z.string().trim().max(2000).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(160),
  password: z.string().min(1, 'Enter your password').max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').max(160),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16).max(256),
  newPassword: z.string().min(8).max(128),
});

export const verifyEmailTokenSchema = z.object({
  token: z.string().trim().min(16).max(256),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(128),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128),
});

export const businessProfileUpdateSchema = z.object({
  brandName: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(1500),
  categoryId: z.string().uuid().optional().nullable(),
  websiteUrl: optionalHttpUrl,
  city: z.string().trim().min(2).max(60),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => !v || GSTIN_REGEX.test(v), 'Enter a valid 15-character GSTIN (e.g. 21AAAAA0000A1Z5)')
    .optional()
    .or(z.literal('')),
  logoUrl: optionalHttpUrl,
});

export const influencerProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().min(10).max(1000),
  niche: z.string().trim().min(2).max(80),
  instagramUrl: optionalHttpUrl,
  youtubeUrl: optionalHttpUrl,
  followerCount: z.coerce.number().int().min(0).max(500_000_000),
  upiId: z
    .string()
    .trim()
    .max(100)
    .refine((v) => !v || UPI_REGEX.test(v), 'Enter a valid UPI ID (e.g. name@okaxis)')
    .optional()
    .or(z.literal('')),
  bankAccountNumber: z
    .string()
    .trim()
    .refine((v) => !v || /^[0-9]{8,20}$/.test(v), 'Bank account number must be 8–20 digits')
    .optional()
    .or(z.literal('')),
  bankIfsc: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => !v || IFSC_REGEX.test(v), 'Enter a valid 11-character IFSC (e.g. HDFC0001234)')
    .optional()
    .or(z.literal('')),
  panNumber: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => !v || PAN_REGEX.test(v), 'Enter a valid 10-character PAN (e.g. ABCDE1234F)')
    .optional()
    .or(z.literal('')),
  bankDetailsNote: z.string().trim().max(300).optional().or(z.literal('')),
});

export const productInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Product title is required').max(140),
    categoryId: z.string().uuid('Select a valid category'),
    description: z
      .string()
      .trim()
      .min(15, 'Describe the product & promotion guidelines (min 15 chars)')
      .max(3000),
    imageUrl: optionalHttpUrl,
    imageAlt: z.string().trim().max(180).optional().or(z.literal('')),
    externalProductUrl: optionalHttpUrl,
    retailPriceRupees: z.coerce
      .number()
      .positive('Product price must be greater than ₹0')
      .max(10_000_000),
    commissionType: z.enum(['FIXED_PER_SALE', 'PERCENTAGE']),
    commissionFixedRupees: z.coerce.number().min(0).max(1_000_000).optional(),
    commissionPercent: z.coerce.number().int().min(1).max(90).optional(),
    buyerDiscountPercent: z.coerce.number().int().min(0).max(80).default(0),
    promoCodePrefix: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{0,10}$/, 'Prefix can use up to 10 letters/numbers')
      .optional()
      .or(z.literal('')),
    status: z.enum(['ACTIVE', 'PAUSED', 'ENDED']).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.commissionType === 'FIXED_PER_SALE') {
      if (!val.commissionFixedRupees || val.commissionFixedRupees <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['commissionFixedRupees'],
          message: 'Enter a fixed commission amount greater than ₹0 per sale',
        });
      } else if (val.commissionFixedRupees >= val.retailPriceRupees) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['commissionFixedRupees'],
          message: 'Fixed commission per sale must be less than the product retail price',
        });
      }
    } else {
      if (!val.commissionPercent || val.commissionPercent < 1 || val.commissionPercent > 90) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['commissionPercent'],
          message: 'Enter a commission percentage between 1% and 90%',
        });
      }
    }
  });

export const enrollmentApplySchema = z.object({
  productId: z.string().uuid(),
  pitchNote: z
    .string()
    .trim()
    .min(5, 'Add a brief note about how you will promote this product')
    .max(600),
});

export const enrollmentDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'PAUSE']),
  customPromoCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9][A-Z0-9-]{2,22}[A-Z0-9]$/,
      'Promo code must be 4–24 uppercase letters, numbers, or hyphens'
    )
    .optional()
    .or(z.literal('')),
  rejectionReason: z.string().trim().max(300).optional().or(z.literal('')),
});

export const logPromoSaleSchema = z.object({
  promoCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, 'Enter the influencer promo code')
    .max(30),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10_000).default(1),
  grossAmountRupees: z.coerce
    .number()
    .positive('Sale amount must be greater than ₹0')
    .max(100_000_000)
    .optional(),
  orderReference: z.string().trim().max(80).optional().or(z.literal('')),
  customerNote: z.string().trim().max(240).optional().or(z.literal('')),
  settlementMode: z
    .enum(['INSTANT', 'HOLD_7_DAYS'])
    .optional()
    .default('INSTANT'),
  dryRun: z.boolean().optional().default(false),
});

export const bulkPromoSaleSchema = z.object({
  settlementMode: z.enum(['INSTANT', 'HOLD_7_DAYS']).optional().default('INSTANT'),
  rows: z
    .array(
      z.object({
        promoCode: z.string().trim().toUpperCase().min(3).max(30),
        quantity: z.coerce.number().int().min(1).max(10_000).default(1),
        grossAmountRupees: z.coerce.number().positive().max(100_000_000).optional(),
        orderReference: z.string().trim().max(80).optional().or(z.literal('')),
        customerNote: z.string().trim().max(240).optional().or(z.literal('')),
      })
    )
    .min(1, 'Include at least 1 CSV order row')
    .max(250, 'Maximum 250 rows per CSV import'),
});

export const saleResolutionSchema = z.object({
  action: z.enum(['CONFIRM', 'REFUND']),
  reason: z.string().trim().max(300).optional().or(z.literal('')),
});

export const brandWalletTopupSchema = z.object({
  amountRupees: z.coerce
    .number()
    .min(500, 'Minimum campaign wallet deposit is ₹500')
    .max(10_000_000),
  paymentMethod: z.enum(['UPI', 'CARD', 'NETBANKING']).default('UPI'),
  reference: z.string().trim().max(80).optional().or(z.literal('')),
});

export const payoutRequestSchema = z.object({
  amountRupees: z.coerce
    .number()
    .min(50, 'Minimum payout request is ₹50')
    .max(10_000_000),
  note: z.string().trim().max(240).optional().or(z.literal('')),
});

export const payoutProcessSchema = z.object({
  action: z.enum(['PAY', 'REJECT']),
  paymentReference: z.string().trim().max(120).optional().or(z.literal('')),
  note: z.string().trim().max(240).optional().or(z.literal('')),
});

export const adminUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  reason: z.string().trim().min(3).max(300),
});

export const customerRequestSchema = z.object({
  productId: z.string().uuid().optional(),
  categoryHint: z.string().trim().max(80).optional(),
  pitchNote: z
    .string()
    .trim()
    .min(5, 'Add a brief note about why you are interested in this product')
    .max(600),
  interestTags: z
    .array(z.string().trim().min(1).max(40))
    .max(8, 'Select up to 8 interest tags')
    .optional(),
  budgetRupees: z
    .coerce
    .number()
    .min(0, 'Budget must be at least ₹0')
    .max(10_000_000, 'Budget exceeds maximum'),
});

export const customerInterestsUpdateSchema = z.object({
  interests: z
    .array(z.string().trim().min(1).max(40))
    .max(12, 'Select up to 12 interest tags'),
});

export const customerSaveOfferSchema = z.object({
  productId: z.string().uuid(),
});

export const otpRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid E.164 phone number (e.g. +919876543210)'),
});

export const otpVerifySchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, 'Enter a valid E.164 phone number'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});

export const totpVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Authenticator code must be 6 digits'),
});
