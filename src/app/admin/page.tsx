'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminConsoleClient } from '@/features/admin/AdminConsoleClient';
import { useAuth } from '@/components/auth/AuthProvider';
import { formatInr } from '@/lib/format';

export default function AdminPage() {
  const { actor, ready } = useAuth();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [overview, setOverview] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/overview', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setOverview(data.overview);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!actor) {
      router.replace('/login?next=/admin');
      return;
    }
    if (actor.user.role !== 'ADMIN') {
      router.replace('/');
      return;
    }
    void load();
  }, [ready, actor, router, load]);

  if (!ready || !actor || actor.user.role !== 'ADMIN' || !overview) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading Platform Admin Console…
      </div>
    );
  }

  const c = overview.counts;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-ink-950">
          Platform Admin &amp; Payout Settlement Console
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Settle influencer UPI/bank payouts with UTR references, oversee marketplace volume, and govern accounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {[
          { label: 'Businesses', value: String(c.businesses) },
          { label: 'Influencers', value: String(c.influencers) },
          {
            label: 'Active Campaigns / Codes',
            value: `${c.activeProducts} / ${c.activePromoCodes}`,
          },
          { label: 'Gross Promo GMV', value: formatInr(c.grossVolumePaise) },
          {
            label: 'Creator Commissions',
            value: formatInr(c.totalCommissionsPaise),
          },
          {
            label: 'Platform Fee Revenue',
            value: formatInr(c.totalPlatformFeesPaise ?? 0),
          },
        ].map((card) => (
          <div key={card.label} className="surface-card p-4">
            <p className="text-[11px] font-semibold text-ink-500">{card.label}</p>
            <p className="mt-1.5 text-lg font-black text-ink-950">{card.value}</p>
          </div>
        ))}
      </div>

      <AdminConsoleClient
        payouts={overview.payouts}
        users={overview.users}
        audits={overview.audits}
        onMutated={load}
      />
    </div>
  );
}
