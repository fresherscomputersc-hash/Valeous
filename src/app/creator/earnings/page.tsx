'use client';

import React, { useState } from 'react';
import { ArrowDownToLine, CheckCircle2, Wallet } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr, rupeesToPaise } from '@/lib/format';

interface WithdrawalRow {
  id: string;
  amountPaise: number;
  destination: string;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  utr: string | null;
  requestedAt: string;
}

export default function CreatorEarningsPage() {
  const { notify } = useToast();
  const [availablePaise, setAvailablePaise] = useState(1450000);
  const [amountRupees, setAmountRupees] = useState('5000');
  const [upiId, setUpiId] = useState('aarav@okicici');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([
    {
      id: 'wd-1001',
      amountPaise: 850000,
      destination: 'aarav@okicici',
      status: 'PAID',
      utr: 'UTR43298120491',
      requestedAt: '2026-11-20',
    },
  ]);

  function handleRequestWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    const numeric = Number(amountRupees);
    const reqPaise = rupeesToPaise(numeric);
    if (!Number.isFinite(numeric) || reqPaise <= 0 || reqPaise > availablePaise) {
      notify('Enter a valid withdrawal amount within your available balance.', 'error');
      return;
    }
    if (!upiId.includes('@')) {
      notify('Enter a valid UPI VPA (e.g. name@bank).', 'error');
      return;
    }

    setAvailablePaise((prev) => prev - reqPaise);
    setWithdrawals((prev) => [
      {
        id: `wd-${Date.now()}`,
        amountPaise: reqPaise,
        destination: upiId.trim(),
        status: 'PENDING',
        utr: null,
        requestedAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    notify(
      reqPaise > 1000000
        ? 'Withdrawal requested (above ₹10,000 threshold: requires four-eyes admin approval).'
        : 'Withdrawal requested and queued for settlement.',
      'success'
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Creator Earnings &amp; Withdrawals
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          All balances are ledger-backed in integer paise and settled in INR via UPI or NEFT.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={handleRequestWithdrawal}
          className="surface-card space-y-4 p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
              <Wallet className="h-5 w-5 text-brand-700" />
              Request Withdrawal
            </h2>
            <span className="text-sm font-black text-brand-700">
              {formatInr(availablePaise)}
            </span>
          </div>

          <div>
            <label className="label-text" htmlFor="wd-amount">
              Amount (INR)
            </label>
            <input
              id="wd-amount"
              type="number"
              min={100}
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="input-field min-h-[44px]"
            />
          </div>

          <div>
            <label className="label-text" htmlFor="wd-upi">
              Verified UPI VPA
            </label>
            <input
              id="wd-upi"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="input-field min-h-[44px] font-mono"
            />
          </div>

          <button type="submit" className="btn-primary min-h-[44px] w-full text-xs">
            <ArrowDownToLine className="h-4 w-4" />
            Submit Withdrawal Request
          </button>
        </form>

        <section className="surface-card space-y-3 p-5 lg:col-span-3">
          <h2 className="text-base font-extrabold text-ink-950">
            Payout History &amp; UTR Receipts
          </h2>
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 p-3.5 text-xs"
              >
                <div>
                  <p className="text-sm font-extrabold text-ink-950">
                    {formatInr(w.amountPaise)}
                  </p>
                  <p className="text-ink-600">
                    To <span className="font-mono">{w.destination}</span> · {w.requestedAt}
                  </p>
                  {w.utr && (
                    <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      UTR: {w.utr}
                    </p>
                  )}
                </div>
                <StatusBadge status={w.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
