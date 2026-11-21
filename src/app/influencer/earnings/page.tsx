'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { InfluencerWalletClient } from '@/features/influencer/InfluencerWalletClient';

export default function InfluencerEarningsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/influencer/dashboard', { credentials: 'include' });
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
        Loading commission wallet &amp; ledger…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Earnings Wallet, Commission Ledger &amp; UTR Receipts
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Track verified promo-code sales, 7-day return clearance holds, and UPI / Bank withdrawals.
        </p>
      </div>

      <InfluencerWalletClient
        wallet={data.wallet}
        sales={data.sales}
        payouts={data.payouts}
        onMutated={load}
      />
    </div>
  );
}
