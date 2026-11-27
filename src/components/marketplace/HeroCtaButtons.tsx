'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

export function HeroCtaButtons() {
  const { actor } = useAuth();

  if (!actor) {
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/register?role=INFLUENCER"
          className="btn-primary rounded-xl px-5 py-3 text-sm"
        >
          Join as Creator
        </Link>
        <Link
          href="/register?role=BUSINESS"
          className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
        >
          Post Your Product (Business)
        </Link>
        <Link
          href="/login"
          className="rounded-xl px-4 py-3 text-sm font-semibold text-brand-200 hover:text-white hover:underline"
        >
          Try 1-Click Demo Accounts →
        </Link>
      </div>
    );
  }

  if (actor.user.role === 'BUSINESS') {
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/business/products/new"
          className="btn-primary rounded-xl px-5 py-3 text-sm"
        >
          + Post New Product
        </Link>
        <Link
          href="/business/sales"
          className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20"
        >
          Sales &amp; CSV Import
        </Link>
        <Link
          href="/business/wallet"
          className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20"
        >
          Campaign Wallet
        </Link>
      </div>
    );
  }

  if (actor.user.role === 'INFLUENCER') {
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/influencer/campaigns"
          className="btn-primary rounded-xl px-5 py-3 text-sm"
        >
          View My Promo Codes
        </Link>
        <Link
          href="/influencer/earnings"
          className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20"
        >
          Open Earnings Wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link href="/admin" className="btn-primary rounded-xl px-5 py-3 text-sm">
        Open Admin &amp; Payout Console
      </Link>
    </div>
  );
}
