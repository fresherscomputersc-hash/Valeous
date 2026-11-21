'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, ExternalLink, MousePointerClick, UserCheck } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { formatCompactNumber, formatInr } from '@/lib/format';

export interface BusinessEnrollmentItem {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED';
  pitchNote: string | null;
  promoCode: string | null;
  suggestedCode: string;
  rejectionReason: string | null;
  clicksCount?: number;
  conversionRatePercent?: number;
  totalSalesCount: number;
  totalUnitsSold: number;
  totalGrossSalesPaise: number;
  totalCommissionPaise: number;
  appliedAt: string;
  productTitle: string;
  productSlug: string;
  influencerHandle: string;
  influencerName: string;
  influencerNiche: string;
  followerCount: number;
  instagramUrl: string | null;
  youtubeUrl: string | null;
}

export function BusinessEnrollmentsClient({
  items,
  onMutated,
}: {
  items: BusinessEnrollmentItem[];
  onMutated?: () => void;
}) {
  const [customCodes, setCustomCodes] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, i.suggestedCode]))
  );
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const router = useRouter();
  const { notify } = useToast();

  useEffect(() => {
    setCustomCodes((prev) => {
      const next = { ...prev };
      for (const i of items) {
        if (!next[i.id]) next[i.id] = i.suggestedCode;
      }
      return next;
    });
  }, [items]);

  async function decide(
    item: BusinessEnrollmentItem,
    action: 'APPROVE' | 'REJECT' | 'PAUSE'
  ) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/business/enrollments/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          customPromoCode:
            action === 'APPROVE' ? (customCodes[item.id] || '').trim() : undefined,
          rejectionReason: action === 'REJECT' ? rejectNotes[item.id] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Action failed', 'error');
        return;
      }

      if (action === 'APPROVE') {
        notify(
          `Approved @${item.influencerHandle}! Promo code ${data.enrollment.promoCode} is now active.`,
          'success'
        );
      } else if (action === 'REJECT') {
        notify(`Rejected @${item.influencerHandle}'s request.`, 'info');
      } else {
        notify(`Paused promo code ${item.promoCode}.`, 'info');
      }

      if (onMutated) {
        onMutated();
      } else {
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="surface-card space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                <Link
                  href={`/creators/${item.influencerHandle}`}
                  className="inline-flex items-center gap-1 text-base font-extrabold text-ink-950 hover:text-brand-700 hover:underline"
                >
                  <span>
                    {item.influencerName} (@{item.influencerHandle})
                  </span>
                  <UserCheck className="h-4 w-4 text-brand-600" />
                </Link>
                <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">
                  {formatCompactNumber(item.followerCount)} followers • {item.influencerNiche}
                </span>
              </div>

              <p className="mt-1 text-xs text-ink-600">
                Product:{' '}
                <Link
                  href={`/products/${item.productSlug}`}
                  className="font-bold text-brand-700 hover:underline"
                >
                  {item.productTitle}
                </Link>
              </p>

              <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
                <Link
                  href={`/creators/${item.influencerHandle}`}
                  className="font-bold text-brand-700 hover:underline"
                >
                  View Creator Portfolio →
                </Link>
                {item.instagramUrl ? (
                  <a
                    href={item.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-ink-600 hover:text-brand-700 hover:underline"
                  >
                    <span>Instagram</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
                {item.youtubeUrl ? (
                  <a
                    href={item.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-ink-600 hover:text-brand-700 hover:underline"
                  >
                    <span>YouTube</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>

            {item.promoCode ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-right">
                <p className="text-[10px] font-bold text-emerald-800 uppercase">
                  Active Promo Code
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-sm font-black tracking-wider text-ink-950">
                    {item.promoCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(item.promoCode!);
                      setCopiedId(item.id);
                      setTimeout(() => setCopiedId(null), 1500);
                    }}
                    className="rounded-md border border-emerald-300 bg-white p-1 text-emerald-800 hover:bg-emerald-100"
                    title="Copy promo code"
                  >
                    {copiedId === item.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {item.pitchNote ? (
            <div className="rounded-xl border border-ink-100 bg-ink-50/70 p-3 text-xs text-ink-700">
              <span className="font-bold text-ink-900">Promotion Pitch: </span>
              {item.pitchNote}
            </div>
          ) : null}

          {item.status === 'APPROVED' || item.totalSalesCount > 0 || (item.clicksCount ?? 0) > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-xs">
              <div className="flex flex-wrap gap-5">
                <span className="inline-flex items-center gap-1">
                  <MousePointerClick className="h-3.5 w-3.5 text-ink-400" />
                  Clicks: <strong className="text-ink-950">{item.clicksCount ?? 0}</strong>
                </span>
                <span>
                  Orders: <strong className="text-ink-950">{item.totalSalesCount}</strong> (
                  {item.totalUnitsSold} units)
                </span>
                <span>
                  Conv:{' '}
                  <strong className="text-brand-700">
                    {item.conversionRatePercent ?? 0}%
                  </strong>
                </span>
                <span>
                  Revenue:{' '}
                  <strong className="text-ink-950">
                    {formatInr(item.totalGrossSalesPaise)}
                  </strong>
                </span>
                <span>
                  Creator Commission:{' '}
                  <strong className="text-emerald-700">
                    {formatInr(item.totalCommissionPaise)}
                  </strong>
                </span>
              </div>

              {item.status === 'APPROVED' ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/business/sales?code=${encodeURIComponent(item.promoCode || '')}`}
                    className="btn-primary py-1.5 text-xs"
                  >
                    Log Sale
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => decide(item, 'PAUSE')}
                    className="btn-secondary py-1.5 text-xs"
                  >
                    Pause Code
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {item.status === 'PENDING' || item.status === 'PAUSED' ? (
            <div className="grid gap-3 border-t border-ink-100 pt-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-ink-600 uppercase">
                  Assign Simple Promo Code
                </label>
                <input
                  type="text"
                  value={customCodes[item.id] ?? item.suggestedCode}
                  onChange={(e) =>
                    setCustomCodes((prev) => ({
                      ...prev,
                      [item.id]: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''),
                    }))
                  }
                  className="input-field mt-1 font-mono text-xs uppercase"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-ink-600 uppercase">
                  Optional Reject Reason
                </label>
                <input
                  type="text"
                  value={rejectNotes[item.id] ?? ''}
                  onChange={(e) =>
                    setRejectNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  placeholder="e.g. Audience mismatch"
                  className="input-field mt-1 text-xs"
                />
              </div>

              <div className="flex items-end gap-2 sm:col-span-3">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => decide(item, 'APPROVE')}
                  className="btn-primary flex-1 py-2 text-xs"
                >
                  Approve &amp; Issue Code
                </button>
                {item.status === 'PENDING' ? (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => decide(item, 'REJECT')}
                    className="btn-secondary py-2 text-xs text-red-700"
                  >
                    Reject
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
