'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr } from '@/lib/format';

export interface BusinessProductRow {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  retailPricePaise: number;
  commissionType: 'FIXED_PER_SALE' | 'PERCENTAGE';
  commissionFixedPaise: number | null;
  commissionPercent: number | null;
  buyerDiscountPercent: number;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  pendingEnrollments: number;
  approvedEnrollments: number;
  totalSalesCount: number;
  totalCommissionPaise: number;
}

export function BusinessProductsTable({ items }: { items: BusinessProductRow[] }) {
  const [rows, setRows] = useState<BusinessProductRow[]>(items);
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();
  const { notify } = useToast();

  React.useEffect(() => {
    setRows(items);
  }, [items]);

  async function setStatus(id: string, statusOnly: 'ACTIVE' | 'PAUSED' | 'ENDED') {
    setBusyId(id);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ statusOnly }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not update status', 'error');
        return;
      }
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status: statusOnly } : row))
      );
      notify(`Product marked ${statusOnly}`, 'success');
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="surface-card overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-ink-200 bg-ink-50/70 font-bold text-ink-600 uppercase">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Retail / Commission</th>
            <th className="px-4 py-3">Creators</th>
            <th className="px-4 py-3">Sales &amp; Payouts</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-ink-50/40">
              <td className="px-4 py-3.5">
                <Link
                  href={`/products/${p.slug}`}
                  className="font-bold text-ink-950 hover:text-brand-700 hover:underline"
                >
                  {p.title}
                </Link>
                <p className="text-[11px] text-ink-500">{p.categoryName}</p>
              </td>
              <td className="px-4 py-3.5">
                <p className="font-semibold text-ink-900">
                  {formatInr(p.retailPricePaise)}
                </p>
                <p className="text-[11px] font-bold text-emerald-700">
                  {p.commissionType === 'FIXED_PER_SALE'
                    ? `${formatInr(p.commissionFixedPaise)} / sale`
                    : `${p.commissionPercent}% commission`}
                  {p.buyerDiscountPercent > 0
                    ? ` • ${p.buyerDiscountPercent}% buyer off`
                    : ''}
                </p>
              </td>
              <td className="px-4 py-3.5">
                <span className="font-bold text-ink-900">{p.approvedEnrollments}</span>{' '}
                active
                {p.pendingEnrollments > 0 ? (
                  <Link
                    href="/business/enrollments?status=PENDING"
                    className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900"
                  >
                    {p.pendingEnrollments} pending
                  </Link>
                ) : null}
              </td>
              <td className="px-4 py-3.5">
                <p className="font-bold text-ink-950">{p.totalSalesCount} sales</p>
                <p className="text-[11px] text-ink-500">
                  {formatInr(p.totalCommissionPaise)} earned by creators
                </p>
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={p.status} />
              </td>
              <td className="px-4 py-3.5 text-right">
                <div className="inline-flex flex-wrap justify-end gap-1.5">
                  <Link
                    href={`/business/products/${p.id}/edit`}
                    className="btn-secondary px-2.5 py-1 text-xs"
                  >
                    Edit
                  </Link>
                  {p.status === 'ACTIVE' ? (
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => setStatus(p.id, 'PAUSED')}
                      className="btn-secondary px-2.5 py-1 text-xs"
                    >
                      Pause
                    </button>
                  ) : p.status === 'PAUSED' ? (
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => setStatus(p.id, 'ACTIVE')}
                      className="btn-primary px-2.5 py-1 text-xs"
                    >
                      Resume
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
