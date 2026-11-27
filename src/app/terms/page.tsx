import React from 'react';

export const metadata = {
  title: 'Terms of Service & ASCI Disclosure Rules',
};

export default function TermsPage() {
  return (
    <div className="surface-card mx-auto max-w-3xl space-y-5 p-6 text-xs leading-relaxed text-ink-700 sm:p-8">
      <h1 className="text-2xl font-extrabold text-ink-950">
        VALUEOUS Terms of Service
      </h1>
      <p>
        <strong>1. Marketplace Role:</strong> VALUEOUS connects verified Businesses listing product commission offers with Creators promoting those products via assigned promo codes and tracked short-links.
      </p>
      <p>
        <strong>2. Commission Calculation &amp; Return Holds:</strong> Commissions are stored in integer INR paise according to the active campaign terms at the time of purchase. Businesses may apply a 7-day return clearance window (`PENDING_CLEARANCE`) and reverse cancelled or returned buyer orders prior to payout settlement.
      </p>
      <p>
        <strong>3. Anti-Fraud &amp; Coupon-Scraping Prohibition:</strong> Promo codes are issued exclusively for the approved creator’s social channels. Uploading codes to public coupon-extension aggregators or placing fraudulent self-orders is grounds for immediate code suspension and forfeiture.
      </p>
      <p>
        <strong>4. ASCI Paid Partnership Disclosure:</strong> Creators promoting products in India must include clear `#ad` or `#collab` disclosures in accordance with Advertising Standards Council of India (ASCI) guidelines.
      </p>
    </div>
  );
}
