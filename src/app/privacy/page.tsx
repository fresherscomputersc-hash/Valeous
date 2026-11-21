import React from 'react';

export const metadata = {
  title: 'Privacy & Data Security Policy',
};

export default function PrivacyPage() {
  return (
    <div className="surface-card mx-auto max-w-3xl space-y-5 p-6 text-xs leading-relaxed text-ink-700 sm:p-8">
      <h1 className="text-2xl font-extrabold text-ink-950">Privacy &amp; Data Policy</h1>
      <p>
        <strong>1. Account &amp; Session Security:</strong> Passwords are hashed with scrypt/Argon2 parameters and never stored in plaintext. Active browser sessions can be inspected and revoked anytime from `/settings/security`.
      </p>
      <p>
        <strong>2. Payout &amp; Tax KYC Information:</strong> Creator UPI VPAs, bank account numbers, IFSC codes, PAN numbers, and Business GSTINs are used strictly for commission disbursements, UTR voucher generation, and statutory tax compliance.
      </p>
      <p>
        <strong>3. Promo Link Click Analytics:</strong> Short-link redirects (`/r/CODE`) hash visitor IP addresses with SHA-256 purely to count aggregate click-to-sale conversion rates without selling personal browsing data.
      </p>
    </div>
  );
}
