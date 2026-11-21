'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  Compass,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
} from 'lucide-react';
import { CustomerProfileForm } from '@/components/customer/CustomerProfileForm';
import { ProofRecommendations } from '@/components/customer/ProofRecommendations';

interface CustomerProfile {
  id: string;
  displayName: string;
  city: string;
  preferences: string | null;
}

interface DashboardStats {
  savedOffersCount: number;
  openRequestsCount: number;
  interestsCount: number;
}

export default function CustomerDashboardPage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch('/api/customer/dashboard', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setStats(data.stats);
      return;
    }
    const data = await res.json().catch(() => null);
    setLoadError(data?.error?.message || 'You need a customer account to view this page.');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <User className="mx-auto h-10 w-10 text-brand-300" />
        <h1 className="mt-3 text-xl font-extrabold text-ink-950">Customer Hub</h1>
        <p className="mt-1 text-xs text-ink-600">{loadError}</p>
        <Link href="/register?role=CUSTOMER" className="btn-primary mt-4 inline-flex text-xs">
          Create a customer account
        </Link>
      </div>
    );
  }

  if (!profile) {
    return <div className="py-12 text-center text-xs text-ink-500">Loading your hub…</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-950">
            Welcome, {profile.displayName}
          </h1>
          <p className="mt-1 text-xs text-ink-600">
            Your VALUEOUS customer hub — find trusted offers, save what you love, use it at
            checkout.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-customer px-3 py-1.5 text-[11px] font-bold text-brand-800">
          <Tag className="h-3.5 w-3.5" />
          {profile.city}
        </span>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-customer text-brand-700">
            <Bookmark className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-extrabold text-ink-950">
              {stats?.savedOffersCount ?? 0}
            </p>
            <p className="text-[11px] font-semibold text-ink-500">Saved offers</p>
          </div>
        </div>
        <div className="surface-card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-customer text-brand-700">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-extrabold text-ink-950">
              {stats?.openRequestsCount ?? 0}
            </p>
            <p className="text-[11px] font-semibold text-ink-500">
              {(stats?.openRequestsCount ?? 0) === 1 ? 'Open request' : 'Open requests'}
            </p>
          </div>
        </div>
        <div className="surface-card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-customer text-brand-700">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-extrabold text-ink-950">
              {stats?.interestsCount ?? 0}
            </p>
            <p className="text-[11px] font-semibold text-ink-500">Interest tags</p>
          </div>
        </div>
      </div>

      {/* Find → Save → Use flow */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/customer/offers"
          className="surface-card group p-5 transition hover:border-brand-400"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-customer text-brand-700">
            <Compass className="h-5 w-5" />
          </span>
          <h2 className="mt-3 flex items-center gap-1 text-base font-extrabold text-ink-950 group-hover:text-brand-800">
            1. Find
            <ArrowRight className="h-4 w-4" />
          </h2>
          <p className="mt-1 text-xs text-ink-600">
            Get offers matched to your needs, interests, city, and proof signals.
          </p>
        </Link>

        <Link
          href="/customer/passport"
          className="surface-card group p-5 transition hover:border-brand-400"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-customer text-brand-700">
            <Bookmark className="h-5 w-5" />
          </span>
          <h2 className="mt-3 flex items-center gap-1 text-base font-extrabold text-ink-950 group-hover:text-brand-800">
            2. Save
            <ArrowRight className="h-4 w-4" />
          </h2>
          <p className="mt-1 text-xs text-ink-600">
            Save offers to your Smart Value Passport with live pricing and discounts.
          </p>
        </Link>

        <div className="surface-card p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-customer text-brand-700">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-base font-extrabold text-ink-950">3. Use</h2>
          <p className="mt-1 text-xs text-ink-600">
            Redeem at checkout and track your post-purchase journey.
          </p>
          <span className="mt-2 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-800">
            Roadmap
          </span>
        </div>
      </div>

      {/* Proof-based recommendations */}
      <ProofRecommendations limit={3} />

      {/* Requests CTA */}
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
            <MessageSquare className="h-5 w-5 text-brand-600" />
            Need something specific?
          </h2>
          <p className="mt-1 text-xs text-ink-600">
            Send a request and let businesses and creators bring the offer to you.
          </p>
        </div>
        <Link href="/customer/requests" className="btn-primary text-xs">
          <MessageSquare className="h-4 w-4" />
          <span>My Requests</span>
        </Link>
      </div>

      {/* Profile */}
      <div className="surface-card max-w-2xl p-6">
        <h2 className="text-lg font-extrabold text-ink-950">Your Profile</h2>
        <p className="mt-1 text-xs text-ink-600">
          Keep this up to date so recommendations and local offers match your life.
        </p>
        <div className="mt-4">
          <CustomerProfileForm profile={profile} onSaved={() => void load()} />
        </div>
      </div>
    </div>
  );
}
