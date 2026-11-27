'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, ShieldCheck, Sparkles, User } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';

function RegisterFormInner() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const initialRole =
    roleParam === 'BUSINESS'
      ? 'BUSINESS'
      : roleParam === 'CUSTOMER'
        ? 'CUSTOMER'
        : 'INFLUENCER';

  const [role, setRole] = useState<'INFLUENCER' | 'BUSINESS' | 'CUSTOMER'>(initialRole);
  const [displayName, setDisplayName] = useState('');
  const [handleOrSlug, setHandleOrSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nicheOrCity, setNicheOrCity] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { establishSession } = useAuth();
  const { notify } = useToast();

  // Basic client-side password strength indicator (Blueprint Ch. 14)
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreeTerms) {
      setError('Please accept the Terms of Service & Privacy Policy to register.');
      return;
    }
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
            : 'Creator account created! Enroll in any product to get your promo code.',
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
    <div className="mx-auto max-w-xl py-6">
      <div className="surface-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-ink-950">Join VALUEOUS</h1>
        <p className="mt-1 text-xs text-ink-600">
          Choose your account type to access specialized tools and workflows:
        </p>

        {/* Accessible Role Selector with min 44px touch targets */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            data-testid="role-select-customer"
            onClick={() => setRole('CUSTOMER')}
            className={`min-h-[44px] rounded-2xl border-2 p-3.5 text-left transition ${
              role === 'CUSTOMER'
                ? 'border-brand-600 bg-brand-50/70 shadow-sm'
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
            className={`min-h-[44px] rounded-2xl border-2 p-3.5 text-left transition ${
              role === 'INFLUENCER'
                ? 'border-creator-600 bg-creator-50/70 shadow-sm'
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
            className={`min-h-[44px] rounded-2xl border-2 p-3.5 text-left transition ${
              role === 'BUSINESS'
                ? 'border-business-600 bg-business-50/70 shadow-sm'
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
                  ? 'Your Full Name'
                  : 'Your Creator / Channel Name'}
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
              className="input-field min-h-[44px]"
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
                className="input-field min-h-[44px]"
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
                placeholder={role === 'INFLUENCER' ? 'Tech & Gadgets' : 'Bhubaneswar / Mumbai'}
                className="input-field min-h-[44px]"
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
              className="input-field min-h-[44px]"
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
              className="input-field min-h-[44px]"
            />

            {/* Password strength indicator */}
            {password ? (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1 h-1.5 w-full">
                  <div
                    className={`h-full flex-1 rounded-full transition ${
                      passwordStrength >= 1 ? 'bg-amber-500' : 'bg-ink-200'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full transition ${
                      passwordStrength >= 2 ? 'bg-amber-500' : 'bg-ink-200'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full transition ${
                      passwordStrength >= 3 ? 'bg-emerald-500' : 'bg-ink-200'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full transition ${
                      passwordStrength >= 4 ? 'bg-emerald-600' : 'bg-ink-200'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-ink-500">
                  {passwordStrength <= 2
                    ? 'Weak password — use uppercase, lowercase and numbers.'
                    : 'Strong cryptographic password.'}
                </p>
              </div>
            ) : null}
          </div>

          {/* Terms and Privacy Checkbox */}
          <div className="flex items-start gap-2 pt-1">
            <input
              id="reg-terms"
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="reg-terms" className="text-xs text-ink-700 leading-normal">
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="font-semibold text-brand-700 hover:underline">
                Terms of Service
              </Link>{' '}
              and acknowledge the{' '}
              <Link href="/privacy" target="_blank" className="font-semibold text-brand-700 hover:underline">
                Privacy Policy
              </Link>.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !agreeTerms}
            className="btn-primary min-h-[44px] w-full py-3"
          >
            {loading ? (
              'Creating account…'
            ) : (
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  {role === 'BUSINESS'
                    ? 'Create Business Account'
                    : role === 'CUSTOMER'
                      ? 'Create Customer Account'
                      : 'Create Creator Account'}
                </span>
              </span>
            )}
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
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl py-12" aria-busy="true">
          <div className="skeleton h-10 w-48 mb-6" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      }
    >
      <RegisterFormInner />
    </Suspense>
  );
}
