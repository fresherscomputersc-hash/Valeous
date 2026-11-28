'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function CreatorLayout({
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
        `/login?next=${encodeURIComponent(pathname || '/creator/dashboard')}`
      );
      return;
    }
    if (actor.user.role !== 'INFLUENCER') {
      router.replace('/');
    }
  }, [ready, actor, pathname, router]);

  if (!ready || !actor || actor.user.role !== 'INFLUENCER') {
    return (
      <div className="space-y-4 py-8" aria-busy="true">
        <div className="skeleton h-14 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  const subLinkClass = (href: string) =>
    `min-h-[44px] inline-flex items-center rounded-lg px-3.5 text-xs font-semibold transition ${
      pathname === href
        ? 'bg-creator-700 text-white font-bold'
        : 'text-ink-800 hover:bg-white'
    }`;

  const handle = actor.influencerProfile?.handle || 'creator';

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-creator-200 bg-creator-50/60 px-5 py-3.5">
        <div>
          <p className="text-xs font-extrabold tracking-wider text-creator-900 uppercase">
            Creator Studio — @{handle}
          </p>
        </div>

        <nav aria-label="Creator navigation" className="flex flex-wrap gap-1.5">
          <Link href="/creator/dashboard" className={subLinkClass('/creator/dashboard')}>
            Overview &amp; Onboarding
          </Link>
          <Link href="/creator/studio" className={subLinkClass('/creator/studio')}>
            Content Studio
          </Link>
          <Link href="/creator/campaigns" className={subLinkClass('/creator/campaigns')}>
            Campaigns
          </Link>
          <Link href="/creator/earnings" className={subLinkClass('/creator/earnings')}>
            Earnings &amp; Withdrawals
          </Link>
        </nav>
      </div>

      {children}
    </div>
  );
}
