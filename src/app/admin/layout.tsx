'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function AdminLayout({
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
      router.replace(`/login?next=${encodeURIComponent(pathname || '/admin')}`);
      return;
    }
    if (actor.user.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [ready, actor, pathname, router]);

  if (!ready || !actor || actor.user.role !== 'ADMIN') {
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
        ? 'bg-ink-950 text-white font-bold'
        : 'text-ink-800 hover:bg-white'
    }`;

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 border-ink-300 bg-ink-50 px-5 py-3.5">
        <div>
          <p className="text-xs font-extrabold tracking-wider text-ink-950 uppercase">
            Admin Governance Console — Masked PII &amp; Four-Eyes Controls
          </p>
        </div>

        <nav aria-label="Admin navigation" className="flex flex-wrap gap-1.5">
          <Link href="/admin" className={subLinkClass('/admin')}>
            Overview
          </Link>
          <Link href="/admin/verifications" className={subLinkClass('/admin/verifications')}>
            KYC &amp; Creator Queue
          </Link>
          <Link href="/admin/moderation" className={subLinkClass('/admin/moderation')}>
            Moderation Queue
          </Link>
          <Link href="/admin/payouts" className={subLinkClass('/admin/payouts')}>
            Four-Eyes Payouts
          </Link>
        </nav>
      </div>

      {children}
    </div>
  );
}
