'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tag, Wallet } from 'lucide-react';
import {
  InfluencerCampaignsClient,
  type InfluencerCampaignItem,
} from '@/features/influencer/InfluencerCampaignsClient';
import { formatInr } from '@/lib/format';

interface InfluencerDashData {
  actor: {
    influencerProfile: { displayName: string; handle: string };
  };
  campaigns: InfluencerCampaignItem[];
  wallet: {
    totalEarnedPaise: number;
    pendingClearancePaise: number;
    availableBalancePaise: number;
    pendingPayoutPaise: number;
    totalPaidPaise: number;
  };
}

export default function InfluencerDashboardPage() {
  const [data, setData] = useState<InfluencerDashData | null>(null);

  useEffect(() => {
    fetch('/api/influencer/dashboard', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading Influencer Studio…
      </div>
    );
  }

  const activeCount = data.campaigns.filter((c) => c.status === 'APPROVED').length;
  const totalClicks = data.campaigns.reduce((s, c) => s + (c.clicksCount ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-950">
            Welcome, {data.actor.influencerProfile.displayName}
          </h1>
          <p className="mt-1 text-xs text-ink-600">
            Share your promo codes &amp; tracked `/r/CODE` links on Reels, Shorts, and Stories to earn commissions on every sale.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link href="/" className="btn-primary text-xs">
            <Tag className="h-4 w-4" />
            <span>Browse More Products</span>
          </Link>
          <Link href="/influencer/earnings" className="btn-secondary text-xs">
            <Wallet className="h-4 w-4" />
            <span>Withdraw Earnings</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href="/influencer/earnings"
          className="surface-card border-emerald-300 bg-emerald-50/50 p-5"
        >
          <p className="text-xs font-bold text-emerald-800 uppercase">
            Available Wallet
          </p>
          <p className="mt-1.5 text-2xl font-black text-emerald-950">
            {formatInr(data.wallet.availableBalancePaise)}
          </p>
        </Link>

        <Link href="/influencer/earnings" className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">Pending Clearance</p>
          <p className="mt-1.5 text-xl font-black text-sky-800">
            {formatInr(data.wallet.pendingClearancePaise)}
          </p>
        </Link>

        <Link href="/influencer/campaigns" className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">Active Promo Codes</p>
          <p className="mt-1.5 text-xl font-black text-ink-950">{activeCount}</p>
        </Link>

        <Link href="/influencer/campaigns" className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">Tracked Link Clicks</p>
          <p className="mt-1.5 text-xl font-black text-ink-950">{totalClicks}</p>
        </Link>

        <Link href="/influencer/earnings" className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">Lifetime Earned</p>
          <p className="mt-1.5 text-xl font-black text-ink-950">
            {formatInr(data.wallet.totalEarnedPaise)}
          </p>
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink-950">
            Your Enrolled Product Campaigns
          </h2>
          <Link
            href="/"
            className="text-xs font-bold text-brand-700 hover:underline"
          >
            Explore Marketplace →
          </Link>
        </div>

        {data.campaigns.length === 0 ? (
          <div className="surface-card p-8 text-center text-xs text-ink-600">
            You haven’t enrolled in any product campaigns yet. Browse the{' '}
            <Link href="/" className="font-bold text-brand-700 underline">
              Products Marketplace
            </Link>{' '}
            to request your first promo code!
          </div>
        ) : (
          <InfluencerCampaignsClient items={data.campaigns} />
        )}
      </section>
    </div>
  );
}
