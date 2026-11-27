'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  Lock,
  LogOut,
  MailWarning,
  Menu,
  PlusCircle,
  Shield,
  Sparkles,
  Tag,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { formatInr } from '@/lib/format';
import { useAuth } from '@/components/auth/AuthProvider';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useToast } from '@/components/ui/ToastProvider';

export function Navbar({ demoMode }: { demoMode?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resendingVerify, setResendingVerify] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { actor, clearSession } = useAuth();
  const { notify } = useToast();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // clear client session even on network hiccup
    }
    setMobileOpen(false);
    router.replace('/');
    setTimeout(() => {
      clearSession();
    }, 60);
    notify('Signed out', 'info');
  }

  async function handleSendVerification() {
    setResendingVerify(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not send verification link', 'error');
        return;
      }
      if (data.verificationPath) {
        notify('Opening email verification confirmation…', 'info');
        router.push(data.verificationPath);
      } else {
        notify('Email is already verified!', 'success');
      }
    } catch {
      notify('Network error while requesting verification', 'error');
    } finally {
      setResendingVerify(false);
    }
  }

  const navLinkClass = (href: string) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      pathname === href || (href !== '/' && pathname.startsWith(href))
        ? 'bg-ink-950 text-white'
        : 'text-ink-700 hover:bg-ink-100 hover:text-ink-950'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/95 backdrop-blur">
      {demoMode ? (
        <div className="bg-ink-950 px-4 py-1.5 text-center text-xs text-ink-200">
          <span className="font-bold text-brand-300">Live Interactive Platform</span> — Businesses post products, Creators share tracked promo codes, and Customers discover curated value.
        </div>
      ) : null}

      {actor && !actor.user.emailVerified ? (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-950">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <MailWarning className="h-3.5 w-3.5 text-amber-700" />
            Please verify your email ({actor.user.email}) for full account protection.
          </span>
          <button
            type="button"
            disabled={resendingVerify}
            onClick={handleSendVerification}
            className="rounded-lg bg-amber-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-950"
          >
            {resendingVerify ? 'Sending…' : 'Verify Email Now'}
          </button>
        </div>
      ) : null}

      <nav
        aria-label="Primary navigation"
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
      >
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-black text-white shadow-sm">
              V
            </span>
            <div>
              <span className="block text-base font-extrabold tracking-tight text-ink-950">
                VALUEOUS
              </span>
              <span className="hidden text-[11px] font-medium text-ink-500 sm:block">
                Customers × Creators × Businesses
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            <Link href="/" className={navLinkClass('/')}>
              <Tag className="h-4 w-4" />
              <span>Marketplace</span>
            </Link>

            {actor?.user.role === 'INFLUENCER' ? (
              <>
                <Link
                  href="/influencer/dashboard"
                  className={navLinkClass('/influencer/dashboard')}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Studio</span>
                </Link>
                <Link
                  href="/influencer/campaigns"
                  className={navLinkClass('/influencer/campaigns')}
                >
                  <span>My Promo Codes</span>
                </Link>
                <Link
                  href="/influencer/earnings"
                  className={navLinkClass('/influencer/earnings')}
                >
                  <Wallet className="h-4 w-4" />
                  <span>
                    Wallet ({formatInr(actor.influencerProfile?.availableBalancePaise ?? 0)})
                  </span>
                </Link>
              </>
            ) : null}

            {actor?.user.role === 'CUSTOMER' ? (
              <>
                <Link
                  href="/customer/dashboard"
                  className={navLinkClass('/customer/dashboard')}
                >
                  <User className="h-4 w-4" />
                  <span>Customer Hub</span>
                </Link>
                <Link
                  href="/customer/offers"
                  className={navLinkClass('/customer/offers')}
                >
                  <Tag className="h-4 w-4" />
                  <span>Find Offers</span>
                </Link>
                <Link
                  href="/customer/passport"
                  className={navLinkClass('/customer/passport')}
                >
                  <span>Passport</span>
                </Link>
              </>
            ) : null}

            {actor?.user.role === 'BUSINESS' ? (
              <>
                <Link
                  href="/business/dashboard"
                  className={navLinkClass('/business/dashboard')}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Business Hub</span>
                </Link>
                <Link
                  href="/business/enrollments"
                  className={navLinkClass('/business/enrollments')}
                >
                  <span>Requests</span>
                </Link>
                <Link href="/business/sales" className={navLinkClass('/business/sales')}>
                  <span>Sales &amp; CSV</span>
                </Link>
                <Link
                  href="/business/wallet"
                  className={navLinkClass('/business/wallet')}
                >
                  <Wallet className="h-4 w-4" />
                  <span>
                    Wallet ({formatInr(actor.businessProfile?.walletBalancePaise ?? 0)})
                  </span>
                </Link>
              </>
            ) : null}

            {actor?.user.role === 'ADMIN' ? (
              <Link href="/admin" className={navLinkClass('/admin')}>
                <Shield className="h-4 w-4" />
                <span>Admin &amp; Payouts</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="hidden items-center gap-2.5 md:flex">
          {actor ? (
            <>
              {actor.user.role === 'BUSINESS' ? (
                <Link href="/business/products/new" className="btn-primary py-2 text-xs">
                  <PlusCircle className="h-4 w-4" />
                  <span>Post Product</span>
                </Link>
              ) : null}

              <NotificationBell userId={actor.user.id} />

              <Link
                href="/settings/security"
                title="Password & Active Sessions"
                className="rounded-xl border border-ink-200 bg-white p-2 text-ink-700 transition hover:bg-ink-50 hover:text-ink-950"
              >
                <Lock className="h-4 w-4" />
              </Link>

              <div className="text-right text-xs">
                <p className="font-bold text-ink-950">{actor.user.displayName}</p>
                <p className="text-ink-500 uppercase">{actor.user.role}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary py-2 text-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/how-it-works"
                className="px-2.5 py-2 text-xs font-semibold text-ink-700 hover:text-ink-950"
              >
                How It Works
              </Link>
              <Link
                href="/pricing"
                className="px-2.5 py-2 text-xs font-semibold text-ink-700 hover:text-ink-950"
              >
                Pricing
              </Link>
              <Link href="/login" className="btn-secondary py-2 text-xs">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary py-2 text-xs">
                Join VALUEOUS
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {actor ? <NotificationBell userId={actor.user.id} /> : null}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg border border-ink-200 p-2 text-ink-800"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="space-y-2 border-t border-ink-200 bg-white px-4 py-4 md:hidden">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
          >
            Products Marketplace
          </Link>

          {actor?.user.role === 'INFLUENCER' ? (
            <>
              <Link
                href="/influencer/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                Creator Studio
              </Link>
              <Link
                href="/influencer/campaigns"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                My Promo Codes
              </Link>
              <Link
                href="/influencer/earnings"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Wallet ({formatInr(actor.influencerProfile?.availableBalancePaise ?? 0)})
              </Link>
            </>
          ) : null}

          {actor?.user.role === 'CUSTOMER' ? (
            <>
              <Link
                href="/customer/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Customer Hub
              </Link>
              <Link
                href="/customer/offers"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                Find Offers
              </Link>
              <Link
                href="/customer/passport"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                Value Passport
              </Link>
              <Link
                href="/customer/requests"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                My Requests
              </Link>
            </>
          ) : null}

          {actor?.user.role === 'BUSINESS' ? (
            <>
              <Link
                href="/business/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                Business Hub
              </Link>
              <Link
                href="/business/products/new"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                + Post New Product
              </Link>
              <Link
                href="/business/enrollments"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                Creator Requests
              </Link>
              <Link
                href="/business/sales"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                Sales &amp; CSV Import
              </Link>
              <Link
                href="/business/wallet"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                Campaign Wallet ({formatInr(actor.businessProfile?.walletBalancePaise ?? 0)})
              </Link>
              <Link
                href="/business/integrations"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                Store Webhooks
              </Link>
            </>
          ) : null}

          {actor?.user.role === 'ADMIN' ? (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
            >
              Admin &amp; Payouts
            </Link>
          ) : null}

          {actor ? (
            <Link
              href="/settings/security"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
            >
              Security &amp; Active Sessions
            </Link>
          ) : (
            <>
              <Link
                href="/how-it-works"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                How It Works
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-100"
              >
                Pricing
              </Link>
            </>
          )}

          <div className="border-t border-ink-100 pt-3">
            {actor ? (
              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary w-full justify-center py-2 text-xs"
              >
                Sign out ({actor.user.displayName})
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn-secondary justify-center py-2 text-xs"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary justify-center py-2 text-xs"
                >
                  Join Free
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
