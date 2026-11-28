'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function InfluencerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { actor, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!actor) {
      router.replace(
        `/login?next=${encodeURIComponent(pathname || '/influencer/dashboard')}`
      );
      return;
    }
    if (actor.user.role !== 'INFLUENCER' || !actor.influencerProfile) {
      router.replace('/');
    }
  }, [ready, actor, pathname, router]);

  if (
    !ready ||
    !actor ||
    actor.user.role !== 'INFLUENCER' ||
    !actor.influencerProfile
  ) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading Creator Studio…
      </div>
    );
  }

  const subLinkClass = (href: string) =>
    `rounded-lg px-3 py-1.5 transition ${
      pathname === href
        ? 'bg-brand-700 text-white font-bold'
        : 'text-ink-800 hover:bg-white'
    }`;

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50/50 px-5 py-3.5">
        <div>
          <p className="text-xs font-extrabold tracking-wider text-brand-900 uppercase">
            Creator Studio — @{actor.influencerProfile.handle}
          </p>
        </div>

        <nav
          aria-label="Creator navigation"
          className="flex flex-wrap gap-1.5 text-xs font-semibold"
        >
          <Link
            href="/influencer/dashboard"
            className={subLinkClass('/influencer/dashboard')}
          >
            Overview
          </Link>
          <Link
            href="/influencer/campaigns"
            className={subLinkClass('/influencer/campaigns')}
          >
            My Promo Codes &amp; Links
          </Link>
          <Link
            href="/influencer/earnings"
            className={subLinkClass('/influencer/earnings')}
          >
            Earnings Wallet &amp; UTRs
          </Link>
          <Link
            href="/influencer/profile"
            className={subLinkClass('/influencer/profile')}
          >
            Profile, UPI &amp; KYC
          </Link>
          <Link
            href={`/creators/${actor.influencerProfile.handle}`}
            className="rounded-lg px-3 py-1.5 font-bold text-brand-700 hover:bg-white"
          >
            Public Portfolio ↗
          </Link>
        </nav>
      </div>

      {children}
    </div>
  );
}
