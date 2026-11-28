'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Clock, KeyRound, Phone, ShieldAlert } from 'lucide-react';
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
    id: 'demo-creator-ananya',
    label: 'Creator: Ananya (@ananya)',
    sub: 'Copy GLOW-ANANYA code + /r/GLOW-ANANYA link & ₹701.40 UPI wallet',
    email: 'influencer.ananya@demo.local',
  },
  {
    id: 'demo-creator-kabir',
    label: 'Creator: Kabir (@kabir)',
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
  const [activeTab, setActiveTab] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  // Lockout state handling (Blueprint Ch. 14 / VLS-109)
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(15 * 60);

  // Phone OTP state (Blueprint Ch. 5 / VLS-109)
  const [phone, setPhone] = useState('+91');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'verify'>('phone');
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession } = useAuth();
  const { notify } = useToast();
  const rawNextPath = searchParams.get('next') || '';
  const safeNextPath =
    rawNextPath.startsWith('/') && !rawNextPath.startsWith('//')
      ? rawNextPath
      : '';

  // Lockout countdown timer
  useEffect(() => {
    if (!isLockedOut || lockoutRemainingSec <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemainingSec((prev) => {
        if (prev <= 1) {
          setIsLockedOut(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLockedOut, lockoutRemainingSec]);

  // OTP resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

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
        if (res.status === 423 || data?.error?.code === 'ACCOUNT_LOCKED') {
          setIsLockedOut(true);
          setLockoutRemainingSec(15 * 60);
          setError(
            data?.error?.message ||
              'Too many failed sign-in attempts. Your account is temporarily locked for 15 minutes.'
          );
        } else {
          setError(data?.error?.message || 'Invalid credentials');
        }
        setLoadingEmail(null);
        return;
      }

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

  async function handleRequestOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number with country code (e.g., +919876543210).');
      return;
    }
    setError(null);
    setOtpLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone: formattedPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Could not send OTP');
        return;
      }
      setPhone(formattedPhone);
      setOtpStep('verify');
      setResendCooldown(30);
      if (data.devCode) {
        setOtpDevCode(data.devCode);
        notify(`OTP sent! [Dev Mode Code: ${data.devCode}]`, 'info');
      } else {
        notify('6-digit OTP code sent to your phone!', 'success');
      }
    } catch {
      setError('Network error sending OTP.');
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setError(null);
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Invalid or expired OTP');
        return;
      }
      notify('Phone verified successfully! Signing you in…', 'success');
      // If an existing session token is returned, establish it; otherwise redirect to role home
      if (data.sessionToken) {
        await establishSession(data.sessionToken);
      }
      router.push(safeNextPath || '/customer/dashboard');
    } catch {
      setError('Network error verifying OTP.');
    } finally {
      setOtpLoading(false);
    }
  }

  const isBusy = loadingEmail !== null || otpLoading;

  return (
    <div className="mx-auto grid max-w-4xl gap-8 py-6 md:grid-cols-12">
      <div className="surface-card p-6 sm:p-8 md:col-span-6">
        <h1 className="text-2xl font-extrabold text-ink-950">Sign in to VALUEOUS</h1>
        <p className="mt-1 text-xs text-ink-600">
          Access your Customer Hub, Business Hub, Creator Studio &amp; Wallet, or Admin Console.
        </p>

        {/* Tab Selector (Password vs Phone OTP) */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-ink-100 p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setError(null);
            }}
            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'password'
                ? 'bg-white text-ink-950 shadow-sm'
                : 'text-ink-600 hover:text-ink-950'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>Password</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('otp');
              setError(null);
            }}
            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'otp'
                ? 'bg-white text-ink-950 shadow-sm'
                : 'text-ink-600 hover:text-ink-950'
            }`}
          >
            <Phone className="h-4 w-4" />
            <span>Phone OTP</span>
          </button>
        </div>

        {/* Account Lockout Alert Banner */}
        {isLockedOut ? (
          <div
            role="alert"
            className="mt-4 space-y-3 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-xs text-red-950 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-extrabold text-red-950">Account Temporarily Locked</p>
                <p className="mt-0.5 text-red-800 leading-relaxed">
                  Too many consecutive failed login attempts. To protect your security, password login is disabled for 15 minutes.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/80 p-2.5 text-xs font-bold text-red-900">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-red-600" />
                <span>Unlocks in:</span>
              </span>
              <span className="font-mono text-sm">{formatTime(lockoutRemainingSec)}</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('otp');
                  setError(null);
                }}
                className="btn-primary min-h-[44px] w-full text-xs"
              >
                Sign in with Phone OTP instead →
              </button>
              <Link
                href="/contact"
                className="w-full text-center text-[11px] font-semibold text-red-700 hover:underline"
              >
                Need help? Contact Platform Security
              </Link>
            </div>
          </div>
        ) : null}

        {error && !isLockedOut ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900"
          >
            {error}
          </div>
        ) : null}

        {/* Tab 1: Email + Password Login Form */}
        {activeTab === 'password' ? (
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
                disabled={isLockedOut || isBusy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field min-h-[44px]"
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
                disabled={isLockedOut || isBusy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field min-h-[44px]"
              />
            </div>

            <button
              type="submit"
              disabled={isLockedOut || isBusy}
              className="btn-primary min-h-[44px] w-full py-2.5"
            >
              {loadingEmail === email && isBusy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          /* Tab 2: Phone OTP Login Form */
          <div className="mt-5 space-y-4">
            {otpStep === 'phone' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label htmlFor="otp-phone" className="label-text">
                    Mobile Phone Number (India E.164)
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="otp-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+919876543210"
                      className="input-field min-h-[44px] pl-10"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-500">
                    A 6-digit verification code with 10-minute validity will be sent.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="btn-primary min-h-[44px] w-full"
                >
                  {otpLoading ? 'Sending OTP…' : 'Send 6-Digit OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="otp-code" className="label-text">
                      Enter 6-Digit Code sent to {phone}
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpStep('phone')}
                      className="text-xs font-semibold text-brand-700 hover:underline"
                    >
                      Change phone
                    </button>
                  </div>
                  <input
                    id="otp-code"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="input-field min-h-[44px] text-center font-mono text-xl tracking-widest"
                  />
                  {otpDevCode ? (
                    <div className="mt-2 rounded-lg border border-brand-200 bg-brand-50 p-2 text-center text-xs font-semibold text-brand-900">
                      [Dev Mode OTP]: <span className="font-mono font-black">{otpDevCode}</span>
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="btn-primary min-h-[44px] w-full"
                >
                  {otpLoading ? 'Verifying OTP…' : 'Verify OTP & Continue'}
                </button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-ink-500">Didn’t receive code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || otpLoading}
                    onClick={() => handleRequestOtp()}
                    className="font-bold text-brand-700 hover:underline disabled:opacity-50"
                  >
                    {resendCooldown > 0
                      ? `Resend OTP (${resendCooldown}s)`
                      : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

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
          Click any account below to test the full Business ↔ Creator workflow immediately:
        </p>

        <div className="space-y-2 pt-1">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              data-testid={acc.id}
              disabled={isBusy}
              onClick={() => void doLogin(acc.email, 'DemoPass123!')}
              className="min-h-[44px] w-full rounded-xl border border-ink-200 bg-white p-3 text-left transition hover:border-brand-400 hover:shadow-sm disabled:opacity-60"
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
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl py-12" aria-busy="true">
          <div className="skeleton h-12 w-48 mb-6" />
          <div className="grid gap-8 md:grid-cols-2">
            <div className="skeleton h-80 rounded-2xl" />
            <div className="skeleton h-80 rounded-2xl" />
          </div>
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  );
}
