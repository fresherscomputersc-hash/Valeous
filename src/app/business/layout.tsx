'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function BusinessLayout({
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
      router.replace(`/login?next=${encodeURIComponent(pathname || '/business/dashboard')}`);
      return;
    }
    if (actor.user.role !== 'BUSINESS' || !actor.businessProfile) {
      router.replace('/');
    }
  }, [ready, actor, pathname, router]);

  if (!ready || !actor || actor.user.role !== 'BUSINESS' || !actor.businessProfile) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading Business Hub…
      </div>
    );
  }

  const subLinkClass = (href: string) =>
    `rounded-lg px-3 py-1.5 transition ${
      pathname === href
        ? 'bg-sky-900 text-white font-bold'
        : 'text-ink-800 hover:bg-white'
    }`;

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-sky-200 bg-sky-50/50 px-5 py-3.5">
        <div>
          <p className="text-xs font-extrabold tracking-wider text-sky-900 uppercase">
            Business Hub — {actor.businessProfile.brandName}
          </p>
        </div>

        <nav
          aria-label="Business navigation"
          className="flex flex-wrap gap-1.5 text-xs font-semibold"
        >
          <Link href="/business/dashboard" className={subLinkClass('/business/dashboard')}>
            Overview
          </Link>
          <Link href="/business/products" className={subLinkClass('/business/products')}>
            My Products
          </Link>
          <Link
            href="/business/products/new"
            className="rounded-lg px-3 py-1.5 font-bold text-brand-700 hover:bg-white"
          >
            + Post Product
          </Link>
          <Link
            href="/business/enrollments"
            className={subLinkClass('/business/enrollments')}
          >
            Influencer Requests
          </Link>
          <Link
            href="/business/sales"
            className="rounded-lg px-3 py-1.5 font-bold text-emerald-800 hover:bg-white"
          >
            Sales &amp; CSV
          </Link>
          <Link href="/business/wallet" className={subLinkClass('/business/wallet')}>
            Campaign Wallet
          </Link>
          <Link
            href="/business/integrations"
            className={subLinkClass('/business/integrations')}
          >
            Store Webhooks
          </Link>
          <Link href="/business/profile" className={subLinkClass('/business/profile')}>
            Brand Profile
          </Link>
        </nav>
      </div>

      {children}
    </div>
  );
}
