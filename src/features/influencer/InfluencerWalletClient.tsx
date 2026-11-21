'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, FileText, Wallet } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDateTime, formatInr } from '@/lib/format';

export function InfluencerWalletClient({
  wallet,
  sales,
  payouts,
  onMutated,
}: {
  wallet: {
    totalEarnedPaise: number;
    pendingClearancePaise?: number;
    availableBalancePaise: number;
    pendingPayoutPaise: number;
    totalPaidPaise: number;
    upiId: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    bankDetailsNote: string | null;
    minPayoutRupees?: number;
  };
  sales: Array<{
    id: string;
    promoCodeSnapshot: string;
    quantity: number;
    grossAmountPaise: number;
    commissionAmountPaise: number;
    status?: string;
    clearsAt?: string | null;
    refundReason?: string | null;
    orderReference: string | null;
    soldAt: string;
    productTitle: string;
    brandName: string;
  }>;
  payouts: Array<{
    id: string;
    amountPaise: number;
    payoutMethodSnapshot: string;
    status: 'PENDING' | 'PAID' | 'REJECTED';
    paymentReference: string | null;
    note: string | null;
    requestedAt: string;
    processedAt: string | null;
  }>;
  onMutated?: () => void;
}) {
  const minRupees = wallet.minPayoutRupees ?? 200;
  const defaultWithdraw =
    wallet.availableBalancePaise >= minRupees * 100
      ? String(Math.floor(wallet.availableBalancePaise / 100))
      : '';
  const [amountRupees, setAmountRupees] = useState(defaultWithdraw);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const { refreshActor } = useAuth();
  const { notify } = useToast();

  const payoutPreview = wallet.upiId
    ? `UPI (${wallet.upiId})`
    : wallet.bankAccountNumber && wallet.bankIfsc
      ? `Bank IMPS (${wallet.bankAccountNumber} / ${wallet.bankIfsc})`
      : wallet.bankDetailsNote;

  const hasPayoutDestination = Boolean(payoutPreview);

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/influencer/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amountRupees: Number(amountRupees),
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not request payout', 'error');
        return;
      }

      notify('Payout request submitted!', 'success');
      setNote('');
      await refreshActor();
      if (onMutated) {
        onMutated();
      } else {
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function exportLedgerCsv() {
    const rows = [
      ['Date', 'Brand', 'Product', 'Promo Code', 'Units', 'Sale (INR)', 'Commission (INR)', 'Status'],
      ...sales.map((s) => [
        s.soldAt,
        s.brandName,
        s.productTitle,
        s.promoCodeSnapshot,
        String(s.quantity),
        (s.grossAmountPaise / 100).toFixed(2),
        (s.commissionAmountPaise / 100).toFixed(2),
        s.status || 'CONFIRMED',
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creator-commission-ledger-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      {/* 5 Wallet Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="surface-card border-emerald-300 bg-emerald-50/50 p-5">
          <p className="text-xs font-bold text-emerald-800 uppercase">
            Available to Withdraw
          </p>
          <p
            data-testid="available-wallet-balance"
            className="mt-1 text-2xl font-black text-emerald-950"
          >
            {formatInr(wallet.availableBalancePaise)}
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">Pending Clearance</p>
          <p className="mt-1 text-2xl font-black text-sky-800">
            {formatInr(wallet.pendingClearancePaise ?? 0)}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-400">7-day return hold</p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">Pending Payouts</p>
          <p className="mt-1 text-2xl font-black text-amber-700">
            {formatInr(wallet.pendingPayoutPaise)}
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">Total Paid Out</p>
          <p className="mt-1 text-2xl font-black text-ink-950">
            {formatInr(wallet.totalPaidPaise)}
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">Lifetime Earned</p>
          <p className="mt-1 text-2xl font-black text-ink-950">
            {formatInr(wallet.totalEarnedPaise)}
          </p>
        </div>
      </div>

      {/* Withdraw / Payout Request Form */}
      <section className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-ink-950">
              Withdraw Earnings to UPI / Bank (Min ₹{minRupees})
            </h2>
            <p className="mt-0.5 text-xs text-ink-600">
              Payout destination:{' '}
              {hasPayoutDestination ? (
                <strong className="text-ink-950">{payoutPreview}</strong>
              ) : (
                <span className="font-bold text-red-700">Not configured yet</span>
              )}
            </p>
          </div>

          <Link href="/influencer/profile" className="btn-secondary py-2 text-xs">
            Update UPI / Bank / PAN
          </Link>
        </div>

        {!hasPayoutDestination ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950">
            Add your <strong>UPI ID</strong> or <strong>Bank Account + IFSC</strong> in{' '}
            <Link href="/influencer/profile" className="font-bold underline">
              Creator Profile &amp; Payouts
            </Link>{' '}
            before requesting a withdrawal.
          </div>
        ) : (
          <form onSubmit={handleRequestPayout} className="mt-4 grid gap-4 sm:grid-cols-12">
            <div className="sm:col-span-4">
              <label htmlFor="payout-amount" className="label-text">
                Withdrawal Amount (₹, min ₹{minRupees})
              </label>
              <input
                id="payout-amount"
                type="number"
                min={minRupees}
                step="1"
                required
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder={String(minRupees)}
                className="input-field"
              />
            </div>

            <div className="sm:col-span-5">
              <label htmlFor="payout-note" className="label-text">
                Note (optional)
              </label>
              <input
                id="payout-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Monthly commission settlement"
                className="input-field"
              />
            </div>

            <div className="flex items-end sm:col-span-3">
              <button
                type="submit"
                disabled={submitting || wallet.availableBalancePaise < minRupees * 100}
                className="btn-primary w-full py-2.5 text-xs"
              >
                <Wallet className="h-4 w-4" />
                <span>{submitting ? 'Submitting…' : 'Request Payout'}</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Payout Requests History */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-ink-950">
          Payout History &amp; UTR Receipts ({payouts.length})
        </h2>
        {payouts.length === 0 ? (
          <div className="surface-card p-6 text-xs text-ink-500">
            No payout withdrawals requested yet.
          </div>
        ) : (
          <div className="surface-card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-200 bg-ink-50/70 font-bold text-ink-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">UTR Reference</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-ink-600">
                      {formatDateTime(p.requestedAt)}
                    </td>
                    <td className="px-4 py-3 font-extrabold text-ink-950">
                      {formatInr(p.amountPaise)}
                    </td>
                    <td className="px-4 py-3 text-ink-800">{p.payoutMethodSnapshot}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-600">
                      {p.paymentReference || p.note || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/influencer/earnings/receipts/${p.id}`}
                        className="inline-flex items-center gap-1 font-bold text-brand-700 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Receipt</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Commission Ledger */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink-950">
            Sale-by-Sale Commission Ledger ({sales.length})
          </h2>
          <button
            type="button"
            onClick={exportLedgerCsv}
            className="btn-secondary py-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {sales.length === 0 ? (
          <div className="surface-card p-6 text-xs text-ink-500">
            Sales made using your promo codes will appear here automatically.
          </div>
        ) : (
          <div className="surface-card overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-200 bg-ink-50/70 font-bold text-ink-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Brand / Product</th>
                  <th className="px-4 py-3">Promo Code</th>
                  <th className="px-4 py-3">Units / Sale</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Your Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {sales.map((s) => {
                  const st = s.status || 'CONFIRMED';
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-ink-600">
                        {formatDateTime(s.soldAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-ink-950">{s.productTitle}</p>
                        <p className="text-[11px] text-ink-500">{s.brandName}</p>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-ink-950">
                        {s.promoCodeSnapshot}
                      </td>
                      <td className="px-4 py-3 text-ink-800">
                        {s.quantity}u • {formatInr(s.grossAmountPaise)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={st} />
                      </td>
                      <td
                        className={`px-4 py-3 font-extrabold ${
                          st === 'REFUNDED'
                            ? 'line-through text-ink-400'
                            : 'text-emerald-700'
                        }`}
                      >
                        +{formatInr(s.commissionAmountPaise)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
