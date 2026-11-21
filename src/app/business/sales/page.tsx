'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BusinessSalesLoggerClient,
  type ActiveCodeOption,
  type SaleRow,
} from '@/features/business/BusinessSalesLoggerClient';

function BusinessSalesInner() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || undefined;
  const [activeCodes, setActiveCodes] = useState<ActiveCodeOption[]>([]);
  const [sales, setSales] = useState<SaleRow[] | null>(null);

  const load = useCallback(async () => {
    const [enrRes, salesRes] = await Promise.all([
      fetch('/api/business/enrollments?status=APPROVED', { credentials: 'include' }),
      fetch('/api/business/sales', { credentials: 'include' }),
    ]);

    if (enrRes.ok) {
      const e = await enrRes.json();
      setActiveCodes(
        (e.enrollments || [])
          .filter((r: { promoCode: string | null }) => Boolean(r.promoCode))
          .map(
            (r: {
              promoCode: string;
              influencerHandle: string;
              productTitle: string;
            }) => ({
              promoCode: r.promoCode,
              influencerHandle: r.influencerHandle,
              productTitle: r.productTitle,
            })
          )
      );
    }

    if (salesRes.ok) {
      const s = await salesRes.json();
      setSales(s.sales || []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!sales) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading sales ledger…
      </div>
    );
  }

  return (
    <BusinessSalesLoggerClient
      initialCode={initialCode}
      activeCodes={activeCodes}
      sales={sales}
      onMutated={load}
    />
  );
}

export default function BusinessSalesPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-xs">Loading…</div>}>
      <BusinessSalesInner />
    </Suspense>
  );
}
