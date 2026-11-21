'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, Sparkles, User } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';

function RegisterFormInner() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const initialRole =
    roleParam === 'BUSINESS' ? 'BUSINESS' : roleParam === 'CUSTOMER' ? 'CUSTOMER' : 'INFLUENCER';

  const [role, setRole] = useState<'INFLUENCER' | 'BUSINESS' | 'CUSTOMER'>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [handleOrSlug, setHandleOrSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nicheOrCity, setNicheOrCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { establishSession } = useAuth();
  const { notify } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        role,
        displayName,
        email,
        password,
      };
      if (handleOrSlug.trim()) {
        payload.handleOrSlug = handleOrSlug.trim().toLowerCase();
      }
      if (role === 'INFLUENCER' && nicheOrCity.trim()) {
        payload.niche = nicheOrCity.trim();
      }
      if ((role === 'BUSINESS' || role === 'CUSTOMER') && nicheOrCity.trim()) {
        payload.city = nicheOrCity.trim();
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Registration failed');
        setLoading(false);
        return;
      }

      await establishSession(data.sessionToken);

      notify(
        role === 'BUSINESS'
          ? 'Business account created! List your first product campaign.'
          : role === 'CUSTOMER'
            ? 'Customer account created! Start discovering offers curated for you.'
            : 'Influencer account created! Enroll in any product to get your promo code.',
        'success'
      );

      router.push(
        role === 'BUSINESS'
          ? '/business/dashboard'
          : role === 'CUSTOMER'
            ? '/customer/dashboard'
            : '/influencer/dashboard'
      );
    } catch {
      setError('Network error during registration.');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg py-6">
      <div className="surface-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-ink-950">Join VALUEOUS</h1>
        <p className="mt-1 text-xs text-ink-600">
          Choose how you want to use the platform:
        </p>

        {/* Role Selector */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            data-testid="role-select-customer"
            onClick={() => setRole('CUSTOMER')}
            className={`rounded-2xl border-2 p-3.5 text-left transition ${
              role === 'CUSTOMER'
                ? 'border-brand-600 bg-brand-50/70'
                : 'border-ink-200 bg-white hover:border-ink-300'
            }`}
          >
            <User className="h-5 w-5 text-brand-600" />
            <p className="mt-1.5 text-sm font-extrabold text-ink-950">I’m a Customer</p>
            <p className="mt-0.5 text-[11px] text-ink-600">
              Discover trusted offers, save picks &amp; shop with value.
            </p>
          </button>

          <button
            type="button"
            data-testid="role-select-influencer"
            onClick={() => setRole('INFLUENCER')}
            className={`rounded-2xl border-2 p-3.5 text-left transition ${
              role === 'INFLUENCER'
                ? 'border-creator-600 bg-creator-50/70'
                : 'border-ink-200 bg-white hover:border-ink-300'
            }`}
          >
            <Sparkles className="h-5 w-5 text-creator-600" />
            <p className="mt-1.5 text-sm font-extrabold text-ink-950">I’m a Creator</p>
            <p className="mt-0.5 text-[11px] text-ink-600">
              Enroll in products, share promo codes &amp; earn per sale.
            </p>
          </button>

          <button
            type="button"
            data-testid="role-select-business"
            onClick={() => setRole('BUSINESS')}
            className={`rounded-2xl border-2 p-3.5 text-left transition ${
              role === 'BUSINESS'
                ? 'border-business-600 bg-business-50/70'
                : 'border-ink-200 bg-white hover:border-ink-300'
            }`}
          >
            <Briefcase className="h-5 w-5 text-business-600" />
            <p className="mt-1.5 text-sm font-extrabold text-ink-950">I’m a Business</p>
            <p className="mt-0.5 text-[11px] text-ink-600">
              Post products, set commissions &amp; grow via creators.
            </p>
          </button>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="reg-name" className="label-text">
              {role === 'BUSINESS'
                ? 'Brand / Business Name'
                : role === 'CUSTOMER'
                  ? 'Your Name'
                  : 'Your Creator Name'}
            </label>
            <input
              id="reg-name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={
                role === 'BUSINESS'
                  ? 'Aura Skincare Co.'
                  : role === 'CUSTOMER'
                    ? 'Priya Sharma'
                    : 'Rohan Verma'
              }
              className="input-field"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-handle" className="label-text">
                {role === 'BUSINESS'
                  ? 'Brand URL slug (optional)'
                  : role === 'CUSTOMER'
                    ? 'Handle (optional)'
                    : 'Creator handle (optional)'}
              </label>
              <input
                id="reg-handle"
                type="text"
                value={handleOrSlug}
                onChange={(e) =>
                  setHandleOrSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                  )
                }
                placeholder={role === 'BUSINESS' ? 'aura-skincare' : 'rohanvlogs'}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="reg-extra" className="label-text">
                {role === 'INFLUENCER' ? 'Primary Niche' : 'City'}
              </label>
              <input
                id="reg-extra"
                type="text"
                value={nicheOrCity}
                onChange={(e) => setNicheOrCity(e.target.value)}
                placeholder={role === 'INFLUENCER' ? 'Tech & Gadgets' : 'Mumbai / Bengaluru'}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className="label-text">
              Email address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="label-text">
              Password (minimum 8 characters)
            </label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading
              ? 'Creating account…'
              : role === 'BUSINESS'
                ? 'Create Business Account'
                : role === 'CUSTOMER'
                  ? 'Create Customer Account'
                  : 'Create Creator Account'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-600">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm">Loading…</div>}>
      <RegisterFormInner />
    </Suspense>
  );
}
