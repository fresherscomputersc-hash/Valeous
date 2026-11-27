import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

export const metadata = {
  title: 'Pricing & Platform Fees',
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-ink-950 sm:text-4xl">
          Simple, Performance-Only Pricing
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Zero agency retainers. Pay only when a creator’s promo code drives a real sale.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="surface-card space-y-4 border-brand-200 p-6 sm:p-8">
          <p className="text-xs font-extrabold tracking-wider text-brand-700 uppercase">
            For Creators
          </p>
          <p className="text-3xl font-black text-ink-950">₹0 — Forever Free</p>
          <p className="text-xs text-ink-600">
            Keep 100% of your advertised product commissions.
          </p>
          <ul className="space-y-2 text-xs text-ink-700">
            {[
              'Unlimited product campaign enrollments',
              'Custom promo codes + tracked /r/CODE short-links',
              'Public creator portfolio (/creators/yourhandle)',
              'UPI & Bank IMPS withdrawals from ₹200 with UTR receipts',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register?role=INFLUENCER"
            className="btn-primary w-full justify-center py-2.5 text-xs"
          >
            Create Free Creator Account
          </Link>
        </div>

        <div className="surface-card space-y-4 border-sky-200 p-6 sm:p-8">
          <p className="text-xs font-extrabold tracking-wider text-sky-800 uppercase">
            For D2C Brands &amp; Retail Businesses
          </p>
          <p className="text-3xl font-black text-ink-950">
            10% Fee <span className="text-sm font-semibold text-ink-500">on commissions</span>
          </p>
          <p className="text-xs text-ink-600">
            Example: Creator earns ₹200 commission → ₹220 deducted from your Campaign Wallet.
          </p>
          <ul className="space-y-2 text-xs text-ink-700">
            {[
              '₹0 monthly subscription or listing fee',
              'Fixed ₹/unit or Percentage (%) commission rules',
              'HMAC-signed Store Order Webhooks & Bulk CSV Import',
              '7-Day return clearance hold & 1-click refund reversal',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register?role=BUSINESS"
            className="btn-primary w-full justify-center py-2.5 text-xs"
          >
            List Your First Product
          </Link>
        </div>
      </div>
    </div>
  );
}
