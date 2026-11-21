'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function CustomerLayout({
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
        `/login?next=${encodeURIComponent(pathname || '/customer/dashboard')}`
      );
      return;
    }
    if (actor.user.role !== 'CUSTOMER' || !actor.customerProfile) {
      router.replace('/');
    }
  }, [ready, actor, pathname, router]);

  if (
    !ready ||
    !actor ||
    actor.user.role !== 'CUSTOMER' ||
    !actor.customerProfile
  ) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading Customer Hub…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-surface-customer px-5 py-3.5">
        <div>
          <p className="text-xs font-extrabold tracking-wider text-brand-900 uppercase">
            Customer Hub — Find · Save · Use
          </p>
        </div>

        <nav
          aria-label="Customer navigation"
          className="flex flex-wrap gap-1.5 text-xs font-semibold"
        >
          {[
            { href: '/customer/dashboard', label: 'Overview' },
            { href: '/customer/offers', label: 'Find Offers' },
            { href: '/customer/passport', label: 'Value Passport' },
            { href: '/customer/requests', label: 'My Requests' },
          ].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'rounded-lg bg-brand-700 px-3 py-1.5 font-bold text-white'
                    : 'rounded-lg px-3 py-1.5 font-semibold text-ink-800 transition hover:bg-white'
                }
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 font-semibold text-ink-800 transition hover:bg-white"
          >
            Browse Marketplace
          </Link>
        </nav>
      </div>

      {children}
    </div>
  );
}
