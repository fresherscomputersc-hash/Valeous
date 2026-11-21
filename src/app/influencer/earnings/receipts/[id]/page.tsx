'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, formatInr } from '@/lib/format';

interface ReceiptData {
  id: string;
  amountPaise: number;
  payoutMethodSnapshot: string;
  status: string;
  paymentReference: string | null;
  note: string | null;
  requestedAt: string;
  processedAt: string | null;
  influencerHandle: string;
  influencerName: string;
  panNumber: string | null;
  influencerEmail: string;
}

export default function PayoutReceiptPage() {
  const params = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/influencer/payouts/${params.id}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setError(d?.error?.message || 'Receipt not found');
        } else {
          setReceipt(d.receipt);
        }
      })
      .catch(() => setError('Failed to load receipt'));
  }, [params.id]);

  if (error) {
    return (
      <div className="surface-card mx-auto max-w-xl p-8 text-center text-xs text-red-800">
        {error}
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading payout receipt…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/influencer/earnings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-700 hover:text-ink-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Wallet</span>
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary py-2 text-xs"
        >
          <Printer className="h-4 w-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      <div className="surface-card space-y-6 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-200 pb-5">
          <div>
            <p className="text-xs font-black tracking-wider text-brand-700 uppercase">
              VALUEOUS Creator Payout Voucher
            </p>
            <h1 className="mt-1 text-2xl font-black text-ink-950">
              {formatInr(receipt.amountPaise)}
            </h1>
            <p className="mt-0.5 font-mono text-[11px] text-ink-500">
              Voucher ID: {receipt.id}
            </p>
          </div>
          <StatusBadge status={receipt.status} />
        </div>

        <div className="grid gap-4 text-xs sm:grid-cols-2">
          <div>
            <p className="text-ink-500">Beneficiary Creator</p>
            <p className="font-bold text-ink-950">
              {receipt.influencerName} (@{receipt.influencerHandle})
            </p>
            <p className="text-ink-600">{receipt.influencerEmail}</p>
          </div>

          <div>
            <p className="text-ink-500">Tax PAN Snapshot</p>
            <p className="font-mono font-bold text-ink-950">
              {receipt.panNumber || 'Not Provided'}
            </p>
          </div>

          <div>
            <p className="text-ink-500">Payout Destination</p>
            <p className="font-bold text-ink-950">{receipt.payoutMethodSnapshot}</p>
          </div>

          <div>
            <p className="text-ink-500">Bank / UPI UTR Reference</p>
            <p className="font-mono font-bold text-emerald-800">
              {receipt.paymentReference || 'Pending Settlement'}
            </p>
          </div>

          <div>
            <p className="text-ink-500">Requested At</p>
            <p className="font-semibold text-ink-900">
              {formatDateTime(receipt.requestedAt)}
            </p>
          </div>

          <div>
            <p className="text-ink-500">Processed At</p>
            <p className="font-semibold text-ink-900">
              {receipt.processedAt ? formatDateTime(receipt.processedAt) : '—'}
            </p>
          </div>
        </div>

        {receipt.note ? (
          <div className="rounded-xl bg-ink-50 p-3.5 text-xs text-ink-700">
            <strong>Settlement Note:</strong> {receipt.note}
          </div>
        ) : null}

        <p className="border-t border-ink-100 pt-4 text-[11px] text-ink-400">
          System-generated statement from VALUEOUS Affiliate Commission Ledger.
        </p>
      </div>
    </div>
  );
}
