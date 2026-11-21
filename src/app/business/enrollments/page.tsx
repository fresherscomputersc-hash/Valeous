'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BusinessEnrollmentsClient,
  type BusinessEnrollmentItem,
} from '@/features/business/BusinessEnrollmentsClient';

function BusinessEnrollmentsInner() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const [items, setItems] = useState<BusinessEnrollmentItem[] | null>(null);

  const load = useCallback(async () => {
    const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    const res = await fetch(`/api/business/enrollments${qs}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      setItems(data.enrollments || []);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">
            Influencer Enrollment Requests &amp; Active Promo Codes
          </h1>
          <p className="mt-1 text-xs text-ink-600">
            Inspect creator portfolios, approve applications to issue promo codes, and monitor click-to-sale conversion rates.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {[
            { label: 'All', val: '' },
            { label: 'Pending', val: 'PENDING' },
            { label: 'Approved', val: 'APPROVED' },
            { label: 'Paused', val: 'PAUSED' },
            { label: 'Rejected', val: 'REJECTED' },
          ].map((tab) => (
            <Link
              key={tab.label}
              href={
                tab.val
                  ? `/business/enrollments?status=${tab.val}`
                  : '/business/enrollments'
              }
              className={`rounded-lg px-3 py-1.5 ${
                statusFilter === tab.val
                  ? 'bg-ink-950 text-white'
                  : 'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {!items ? (
        <div className="py-12 text-center text-xs text-ink-500">
          Loading creator enrollments…
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card p-8 text-center text-xs text-ink-600">
          No influencer enrollments match this filter yet.
        </div>
      ) : (
        <BusinessEnrollmentsClient items={items} onMutated={load} />
      )}
    </div>
  );
}

export default function BusinessEnrollmentsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs">Loading…</div>}>
      <BusinessEnrollmentsInner />
    </Suspense>
  );
}
