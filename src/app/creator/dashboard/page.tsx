'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr } from '@/lib/format';

interface OnboardingStep {
  id: string;
  label: string;
  status: 'COMPLETED' | 'PENDING' | 'IN_REVIEW';
  detail: string;
}

export default function CreatorDashboardPage() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState('6400');
  const [socialHandleUrl, setSocialHandleUrl] = useState('https://instagram.com/aarav.explores');
  const [verificationStatus, setVerificationStatus] = useState<'PENDING' | 'APPROVED'>('PENDING');
  const [stats, setStats] = useState({
    activeCampaigns: 3,
    publishedPosts: 4,
    availableBalancePaise: 1450000,
    pendingClearancePaise: 320000,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/influencer/dashboard', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data?.stats) {
          setStats((prev) => ({
            ...prev,
            availableBalancePaise:
              typeof data.stats.availableBalancePaise === 'number'
                ? data.stats.availableBalancePaise
                : prev.availableBalancePaise,
            pendingClearancePaise:
              typeof data.stats.pendingClearancePaise === 'number'
                ? data.stats.pendingClearancePaise
                : prev.pendingClearancePaise,
          }));
        }
      }
    } catch {
      // fallback stats remain
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSubmitFollowerVerification(e: React.FormEvent) {
    e.preventDefault();
    const count = Number(followerCount);
    if (!Number.isFinite(count) || count < 5000) {
      notify('Creator verification requires at least 5,000 followers.', 'error');
      return;
    }
    setVerificationStatus('PENDING');
    notify('5,000+ follower verification submitted for Admin review.', 'success');
  }

  const steps: OnboardingStep[] = [
    {
      id: 'profile',
      label: '1. Creator Profile & Niche',
      status: 'COMPLETED',
      detail: 'Display name, bio, and city configured.',
    },
    {
      id: 'followers',
      label: '2. 5,000+ Follower Verification',
      status: verificationStatus === 'APPROVED' ? 'COMPLETED' : 'IN_REVIEW',
      detail: 'Minimum 5,000 verified followers required to unlock paid campaigns.',
    },
    {
      id: 'kyc',
      label: '3. PAN & UPI/Bank Settlement Setup',
      status: 'COMPLETED',
      detail: 'Masked payout method verified for withdrawals.',
    },
    {
      id: 'studio',
      label: '4. Proof-Badged Content Studio',
      status: 'COMPLETED',
      detail: 'Publish recommendations with Visited, Researched, Gifted, or Paid badge.',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skeleton h-8 w-1/3" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton h-24 w-full" />
          ))}
        </div>
        <div className="skeleton h-52 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Creator Studio Overview</h1>
          <p className="mt-1 text-xs text-ink-600">
            Track onboarding verification, publish proof-badged content, and manage campaign payouts.
          </p>
        </div>
        <Link href="/creator/studio" className="btn-primary min-h-[44px] inline-flex items-center text-xs">
          <Sparkles className="h-4 w-4" />
          Open Content Studio
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold text-ink-500">Active Campaigns</p>
          <p className="mt-1 text-2xl font-black text-ink-950">{stats.activeCampaigns}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold text-ink-500">Proof-Badged Posts</p>
          <p className="mt-1 text-2xl font-black text-creator-700">{stats.publishedPosts}</p>
        </div>
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold text-ink-500">Available Earnings</p>
          <p className="mt-1 text-2xl font-black text-brand-700">
            {formatInr(stats.availableBalancePaise)}
          </p>
        </div>
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold text-ink-500">Pending Clearance</p>
          <p className="mt-1 text-2xl font-black text-amber-700">
            {formatInr(stats.pendingClearancePaise)}
          </p>
        </div>
      </div>

      {/* Onboarding Tracker */}
      <section className="surface-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
            <UserCheck className="h-5 w-5 text-creator-700" />
            Creator Onboarding &amp; 5,000-Follower Verification Tracker
          </h2>
          <StatusBadge status={verificationStatus} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {steps.map((s) => (
            <div key={s.id} className="rounded-xl border border-ink-200 p-4 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink-950">{s.label}</span>
                {s.status === 'COMPLETED' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <p className="mt-1 text-ink-600">{s.detail}</p>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmitFollowerVerification}
          className="grid gap-3 border-t border-ink-100 pt-4 sm:grid-cols-3"
        >
          <div>
            <label className="label-text" htmlFor="creator-social">
              Primary Social Profile URL
            </label>
            <input
              id="creator-social"
              type="url"
              required
              value={socialHandleUrl}
              onChange={(e) => setSocialHandleUrl(e.target.value)}
              className="input-field min-h-[44px] text-xs"
            />
          </div>
          <div>
            <label className="label-text" htmlFor="creator-followers">
              Follower Count (min 5,000)
            </label>
            <input
              id="creator-followers"
              type="number"
              min={0}
              required
              value={followerCount}
              onChange={(e) => setFollowerCount(e.target.value)}
              className="input-field min-h-[44px] text-xs"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary min-h-[44px] w-full text-xs">
              Submit Follower Verification
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/creator/campaigns" className="surface-card p-5 transition hover:border-creator-400">
          <TrendingUp className="h-5 w-5 text-creator-700" />
          <h3 className="mt-2 text-sm font-extrabold text-ink-950">10-Stage Campaign Workspace</h3>
          <p className="mt-1 text-xs text-ink-600">
            Track briefs, draft approvals, promo codes, and attribution priority.
          </p>
        </Link>
        <Link href="/creator/earnings" className="surface-card p-5 transition hover:border-creator-400">
          <Wallet className="h-5 w-5 text-brand-700" />
          <h3 className="mt-2 text-sm font-extrabold text-ink-950">Earnings &amp; Withdrawals</h3>
          <p className="mt-1 text-xs text-ink-600">
            Request UPI/bank withdrawals and view UTR settlement receipts.
          </p>
        </Link>
      </div>
    </div>
  );
}
