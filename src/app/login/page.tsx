'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';

const DEMO_ACCOUNTS = [
  {
    id: 'demo-biz-glow',
    label: 'Business: VedaGlow Botanicals',
    sub: 'Manage products, ₹24,228 wallet, webhooks & log GLOW-ANANYA sales',
    email: 'business.glow@demo.local',
  },
  {
    id: 'demo-biz-roast',
    label: 'Business: Koraput Estate Coffee',
    sub: 'Approve 2 pending creators, CSV import & log BREW-KABIR sales',
    email: 'business.roast@demo.local',
  },
  {
    id: 'demo-inf-ananya',
    label: 'Influencer: Ananya (@ananya)',
    sub: 'Copy GLOW-ANANYA code + /r/GLOW-ANANYA link & ₹701.40 UPI wallet',
    email: 'influencer.ananya@demo.local',
  },
  {
    id: 'demo-inf-kabir',
    label: 'Influencer: Kabir (@kabir)',
    sub: 'View BREW-KABIR analytics, ledger & pending ₹500 UPI payout',
    email: 'influencer.kabir@demo.local',
  },
  {
    id: 'demo-customer',
    label: 'Customer: Priya Sharma',
    sub: 'Explore the Customer Hub — Find, Save & Use curated offers',
    email: 'customer@demo.local',
  },
  {
    id: 'demo-admin',
    label: 'Platform Admin',
    sub: 'Settle payouts with UTR receipts, manage accounts & audit logs',
    email: 'admin@demo.local',
  },
];

function LoginFormInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession } = useAuth();
  const { notify } = useToast();
  const rawNextPath = searchParams.get('next') || '';
  const safeNextPath =
    rawNextPath.startsWith('/') && !rawNextPath.startsWith('//')
      ? rawNextPath
      : '';

  async function doLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setLoadingEmail(loginEmail);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Invalid credentials');
        setLoadingEmail(null);
        return;
      }

      // Establish dual Cookie + Bearer token session BEFORE navigating so even browsers
      // blocking third-party iframe cookies stay authenticated across every route!
      await establishSession(data.sessionToken);

      notify(`Welcome back, ${data.user.displayName}!`, 'success');
      const role = data.user.role as 'INFLUENCER' | 'BUSINESS' | 'ADMIN' | 'CUSTOMER';
      const roleDefault =
        role === 'BUSINESS'
          ? '/business/dashboard'
          : role === 'INFLUENCER'
            ? '/influencer/dashboard'
            : role === 'CUSTOMER'
              ? '/customer/dashboard'
              : '/admin';

      const nextAllowedForRole =
        Boolean(safeNextPath) &&
        !(safeNextPath.startsWith('/business') && role !== 'BUSINESS') &&
        !(safeNextPath.startsWith('/influencer') && role !== 'INFLUENCER') &&
        !(safeNextPath.startsWith('/customer') && role !== 'CUSTOMER') &&
        !(safeNextPath.startsWith('/admin') && role !== 'ADMIN');

      router.push(nextAllowedForRole ? safeNextPath : roleDefault);
    } catch {
      setError('Network error while signing in.');
      setLoadingEmail(null);
    }
  }

  const isBusy = loadingEmail !== null;

  return (
    <div className="mx-auto grid max-w-4xl gap-8 py-6 md:grid-cols-12">
      <div className="surface-card p-6 sm:p-8 md:col-span-6">
        <h1 className="text-2xl font-extrabold text-ink-950">Sign in to VALUEOUS</h1>
        <p className="mt-1 text-xs text-ink-600">
          Access your Customer Hub, Business Hub, Influencer Promo Codes &amp; Wallet, or Admin Console.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900"
          >
            {error}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void doLogin(email, password);
          }}
          className="mt-5 space-y-4"
        >
          <div>
            <label htmlFor="login-email" className="label-text">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="label-text">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <button type="submit" disabled={isBusy} className="btn-primary w-full py-2.5">
            {loadingEmail === email && isBusy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-600">
          New here?{' '}
          <Link href="/register" className="font-bold text-brand-700 hover:underline">
            Create a Customer, Creator or Business account
          </Link>
        </p>
      </div>

      {/* 1-Click Demo Switcher */}
      <div className="surface-card space-y-3 border-brand-200 bg-brand-50/40 p-6 md:col-span-6">
        <p className="text-xs font-extrabold tracking-wider text-brand-800 uppercase">
          1-Click Demo Accounts (Password: DemoPass123!)
        </p>
        <p className="text-xs text-ink-600">
          Click any account below to test the full Business ↔ Influencer workflow immediately:
        </p>

        <div className="space-y-2 pt-1">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              data-testid={acc.id}
              disabled={isBusy}
              onClick={() => void doLogin(acc.email, 'DemoPass123!')}
              className="w-full rounded-xl border border-ink-200 bg-white p-3 text-left transition hover:border-brand-400 hover:shadow-sm disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-ink-950">{acc.label}</p>
                {loadingEmail === acc.email ? (
                  <span className="text-[11px] font-bold text-brand-700">
                    Signing in…
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-ink-600">{acc.sub}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm">Loading…</div>}>
      <LoginFormInner />
    </Suspense>
  );
}
