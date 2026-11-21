'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Ticket, Users, Webhook } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, formatInr } from '@/lib/format';

interface DashboardData {
  actor: {
    businessProfile: { brandName: string };
  };
  metrics: {
    walletBalancePaise: number;
    activeProducts: number;
    totalProducts: number;
    pendingEnrollments: number;
    activePromoCodes: number;
    totalPromoClicks: number;
    totalSalesLogged: number;
    totalUnitsSold: number;
    totalGrossSalesPaise: number;
    totalInfluencerCommissionPaise: number;
  };
  enrollments: Array<{ id: string; status: string }>;
  recentSales: Array<{
    id: string;
    promoCodeSnapshot: string;
    quantity: number;
    grossAmountPaise: number;
    commissionAmountPaise: number;
    status: string;
    soldAt: string;
    productTitle: string;
    influencerHandle: string;
  }>;
}

export default function BusinessDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/business/dashboard', { credentials: 'include' });
    if (res.ok) {
      setData(await res.json());
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading business metrics…
      </div>
    );
  }

  const { metrics, actor, enrollments, recentSales } = data;
  const pendingCount = enrollments.filter((e) => e.status === 'PENDING').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-950">
            {actor.businessProfile.brandName}
          </h1>
          <p className="mt-1 text-xs text-ink-600">
            Post products, approve influencers to issue promo codes, fund your campaign wallet, and sync store orders.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link href="/business/products/new" className="btn-primary text-xs">
            <PlusCircle className="h-4 w-4" />
            <span>Post New Product</span>
          </Link>
          <Link href="/business/sales" className="btn-secondary text-xs">
            <Ticket className="h-4 w-4" />
            <span>Log Sale / CSV</span>
          </Link>
          <Link href="/business/integrations" className="btn-secondary text-xs">
            <Webhook className="h-4 w-4" />
            <span>Store Webhooks</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {[
          {
            label: 'Campaign Wallet',
            value: formatInr(metrics.walletBalancePaise),
            href: '/business/wallet',
          },
          {
            label: 'Active Products',
            value: String(metrics.activeProducts),
            href: '/business/products',
          },
          {
            label: 'Pending Requests',
            value: String(metrics.pendingEnrollments),
            href: '/business/enrollments?status=PENDING',
            highlight: metrics.pendingEnrollments > 0,
          },
          {
            label: 'Active Codes / Clicks',
            value: `${metrics.activePromoCodes} (${metrics.totalPromoClicks} clicks)`,
            href: '/business/enrollments?status=APPROVED',
          },
          {
            label: 'Promo Sales Volume',
            value: `${formatInr(metrics.totalGrossSalesPaise)} (${metrics.totalUnitsSold}u)`,
            href: '/business/sales',
          },
          {
            label: 'Creator Commissions',
            value: formatInr(metrics.totalInfluencerCommissionPaise),
            href: '/business/sales',
          },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`surface-card p-4 transition hover:border-brand-400 ${
              card.highlight ? 'border-amber-300 bg-amber-50/40' : ''
            }`}
          >
            <p className="text-[11px] font-semibold text-ink-500">{card.label}</p>
            <p className="mt-1.5 text-lg font-black text-ink-950">{card.value}</p>
          </Link>
        ))}
      </div>

      {pendingCount > 0 ? (
        <div className="surface-card flex flex-wrap items-center justify-between gap-4 border-amber-300 bg-amber-50/60 p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-amber-700" />
            <div className="text-xs">
              <p className="font-extrabold text-ink-950">
                {pendingCount} influencer(s) waiting for promo code approval!
              </p>
              <p className="text-ink-600">
                Inspect their creator portfolio and click Approve to issue their tracked promo code.
              </p>
            </div>
          </div>
          <Link
            href="/business/enrollments?status=PENDING"
            className="btn-primary py-2 text-xs"
          >
            Review Requests
          </Link>
        </div>
      ) : null}

      {/* Recent Sales */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink-950">Recent Promo-Code Sales</h2>
          <Link
            href="/business/sales"
            className="text-xs font-bold text-brand-700 hover:underline"
          >
            Log new sale / Bulk CSV / Refunds →
          </Link>
        </div>

        {recentSales.length === 0 ? (
          <div className="surface-card p-6 text-xs text-ink-500">
            No promo-code sales logged yet.
          </div>
        ) : (
          <div className="surface-card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-200 bg-ink-50/70 font-bold text-ink-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Promo Code</th>
                  <th className="px-4 py-3">Influencer</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Sale Gross</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {recentSales.slice(0, 8).map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-ink-600">{formatDateTime(s.soldAt)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-ink-950">
                      {s.promoCodeSnapshot}
                    </td>
                    <td className="px-4 py-3 text-ink-800">@{s.influencerHandle}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">{s.productTitle}</td>
                    <td className="px-4 py-3 font-semibold text-ink-900">
                      {s.quantity}u • {formatInr(s.grossAmountPaise)}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-emerald-700">
                      {formatInr(s.commissionAmountPaise)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status || 'CONFIRMED'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
