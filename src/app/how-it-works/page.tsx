import React from 'react';
import Link from 'next/link';
import { Briefcase, CheckCircle2, Link2, ShieldCheck, Ticket, Wallet } from 'lucide-react';

export const metadata = {
  title: 'How VALUEOUS Works',
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 py-4">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-ink-950 sm:text-4xl">
          How VALUEOUS Works
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          Transparent promo-code performance marketing for Brands and Creators.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {[
          {
            icon: Briefcase,
            title: '1. Brands List Products & Fund Wallet',
            body: 'Businesses post products with either a Fixed ₹ per-unit payout or a Percentage (%) commission, plus an optional buyer discount %, and top up their Campaign Wallet.',
          },
          {
            icon: CheckCircle2,
            title: '2. Creators Apply & Get Approved',
            body: 'Influencers pitch how they will promote the product. Brands inspect the creator’s public portfolio (/creators/handle) and approve with 1 click.',
          },
          {
            icon: Link2,
            title: '3. Tracked Code + /r/CODE Short-Link',
            body: 'Approved creators get a clean promo code (e.g. GLOW-ANANYA), a click-tracked /r/GLOW-ANANYA redirect link, and an ASCI-compliant #ad caption.',
          },
          {
            icon: Ticket,
            title: '4. Automated Webhook, CSV or Counter Sync',
            body: 'Customer orders sync automatically via HMAC-signed Store Webhooks, Bulk CSV import, or manual counter entry with duplicate-order protection.',
          },
          {
            icon: ShieldCheck,
            title: '5. Optional 7-Day Return Clearance',
            body: 'Brands can settle commissions immediately or use a 7-day return/COD clearance hold so cancelled orders can be cleanly refunded.',
          },
          {
            icon: Wallet,
            title: '6. UPI / Bank Withdrawals + UTR Slips',
            body: 'Creators withdraw available balances straight to verified UPI IDs or Bank IMPS accounts and download printable UTR payout vouchers.',
          },
        ].map((step) => (
          <div key={step.title} className="surface-card space-y-2 p-6">
            <step.icon className="h-6 w-6 text-brand-600" />
            <h2 className="text-base font-extrabold text-ink-950">{step.title}</h2>
            <p className="text-xs leading-relaxed text-ink-600">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/register?role=BUSINESS" className="btn-primary text-xs">
          Start as a Business
        </Link>
        <Link href="/register?role=INFLUENCER" className="btn-secondary text-xs">
          Join as a Creator
        </Link>
      </div>
    </div>
  );
}
