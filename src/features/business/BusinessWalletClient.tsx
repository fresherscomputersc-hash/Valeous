'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Download, PlusCircle, Wallet } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { formatDateTime, formatInr } from '@/lib/format';

interface WalletOverview {
  wallet: {
    id: string;
    brandName: string;
    gstin: string | null;
    walletBalancePaise: number;
    totalDepositedPaise: number;
    totalSpentPaise: number;
  };
  platformFeePercent: number;
  transactions: Array<{
    id: string;
    type: string;
    amountPaise: number;
    balanceAfterPaise: number;
    reference: string | null;
    description: string;
    createdAt: string;
  }>;
}

export function BusinessWalletClient() {
  const [data, setData] = useState<WalletOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [amountRupees, setAmountRupees] = useState('5000');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [reference, setReference] = useState('');
  const [depositing, setDepositing] = useState(false);

  const { refreshActor } = useAuth();
  const { notify } = useToast();

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business/wallet', { credentials: 'include' });
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault();
    setDepositing(true);
    try {
      const res = await fetch('/api/business/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amountRupees: Number(amountRupees),
          paymentMethod,
          reference: reference.trim() || undefined,
        }),
      });
      const out = await res.json();
      if (!res.ok) {
        notify(out?.error?.message || 'Wallet deposit failed', 'error');
        return;
      }
      setReference('');
      notify(`Deposited ₹${amountRupees} into your Campaign Wallet!`, 'success');
      await Promise.all([loadWallet(), refreshActor()]);
    } catch {
      notify('Network error processing deposit', 'error');
    } finally {
      setDepositing(false);
    }
  }

  function exportLedgerCsv() {
    if (!data) return;
    const rows = [
      ['Date', 'Type', 'Amount (INR)', 'Balance After (INR)', 'Reference', 'Description'],
      ...data.transactions.map((t) => [
        t.createdAt,
        t.type,
        (t.amountPaise / 100).toFixed(2),
        (t.balanceAfterPaise / 100).toFixed(2),
        t.reference || '',
        t.description,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-wallet-ledger-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !data) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading Campaign Wallet…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Brand Campaign Wallet &amp; Billing
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Pre-fund creator commissions so influencers promote with 100% payout confidence. Every verified sale deducts creator commission + {data.platformFeePercent}% platform fee automatically.
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface-card border-emerald-300 bg-emerald-50/50 p-5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
            <Wallet className="h-4 w-4" />
            <span>Available Campaign Balance</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            {formatInr(data.wallet.walletBalancePaise)}
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">Total Deposited</p>
          <p className="mt-2 text-xl font-black text-ink-950">
            {formatInr(data.wallet.totalDepositedPaise)}
          </p>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-semibold text-ink-500">
            Commissions + Platform Fees Settled
          </p>
          <p className="mt-2 text-xl font-black text-ink-950">
            {formatInr(data.wallet.totalSpentPaise)}
          </p>
        </div>
      </div>

      {/* Deposit Form */}
      <section className="surface-card p-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-brand-600" />
          <h2 className="text-base font-extrabold text-ink-950">
            Add Campaign Budget (Instant Checkout)
          </h2>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {['2500', '5000', '10000', '25000'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmountRupees(preset)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                amountRupees === preset
                  ? 'border-brand-600 bg-brand-50 text-brand-800'
                  : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300'
              }`}
            >
              + ₹{Number(preset).toLocaleString('en-IN')}
            </button>
          ))}
        </div>

        <form onSubmit={handleTopup} className="mt-4 grid gap-4 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <label htmlFor="w-amount" className="label-text">
              Deposit Amount (₹, min ₹500)
            </label>
            <input
              id="w-amount"
              type="number"
              min="500"
              step="100"
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="w-method" className="label-text">
              Payment Mode
            </label>
            <select
              id="w-method"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as 'UPI' | 'CARD' | 'NETBANKING')
              }
              className="input-field"
            >
              <option value="UPI">UPI Instant Collect</option>
              <option value="NETBANKING">Corporate NetBanking / NEFT</option>
              <option value="CARD">Business Credit / Debit Card</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="w-ref" className="label-text">
              UTR / Payment Reference (optional)
            </label>
            <input
              id="w-ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Auto-generated if blank"
              className="input-field"
            />
          </div>

          <div className="sm:col-span-12">
            <button type="submit" disabled={depositing} className="btn-primary text-xs">
              <PlusCircle className="h-4 w-4" />
              <span>
                {depositing ? 'Processing deposit…' : `Deposit ₹${amountRupees} to Wallet`}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* Transactions Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink-950">
            Wallet Statement ({data.transactions.length})
          </h2>
          <button
            type="button"
            onClick={exportLedgerCsv}
            className="btn-secondary py-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Statement CSV</span>
          </button>
        </div>

        <div className="surface-card overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink-200 bg-ink-50/70 font-bold text-ink-600 uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Entry Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.transactions.map((t) => {
                const isCredit = t.type !== 'SALE_COMMISSION_DEBIT';
                return (
                  <tr key={t.id} className="hover:bg-ink-50/40">
                    <td className="px-4 py-3 text-ink-600">
                      {formatDateTime(t.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.type} />
                    </td>
                    <td className="px-4 py-3 text-ink-800">
                      <p className="font-medium">{t.description}</p>
                      {t.reference ? (
                        <p className="font-mono text-[10px] text-ink-400">
                          Ref: {t.reference}
                        </p>
                      ) : null}
                    </td>
                    <td
                      className={`px-4 py-3 font-extrabold ${
                        isCredit ? 'text-emerald-700' : 'text-amber-900'
                      }`}
                    >
                      {isCredit ? '+' : '−'}
                      {formatInr(t.amountPaise)}
                    </td>
                    <td className="px-4 py-3 font-bold text-ink-950">
                      {formatInr(t.balanceAfterPaise)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
