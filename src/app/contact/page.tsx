import React from 'react';
import { Mail, MapPin, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Contact & Compliance Support',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Support, Onboarding &amp; Compliance
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Need help connecting your store webhook, verifying GSTIN/PAN, or reconciling a UTR payout?
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card space-y-1.5 p-5 text-xs">
          <Mail className="h-5 w-5 text-brand-600" />
          <p className="font-extrabold text-ink-950">Creator &amp; Payout Desk</p>
          <p className="text-ink-600">payouts@promobridge.local</p>
        </div>

        <div className="surface-card space-y-1.5 p-5 text-xs">
          <ShieldCheck className="h-5 w-5 text-sky-600" />
          <p className="font-extrabold text-ink-950">Brand Webhooks &amp; Billing</p>
          <p className="text-ink-600">brands@promobridge.local</p>
        </div>

        <div className="surface-card space-y-1.5 p-5 text-xs">
          <MapPin className="h-5 w-5 text-emerald-600" />
          <p className="font-extrabold text-ink-950">Operations Hub</p>
          <p className="text-ink-600">Bhubaneswar, Odisha, India</p>
        </div>
      </div>
    </div>
  );
}
