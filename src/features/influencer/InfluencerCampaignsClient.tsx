'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  MousePointerClick,
  Share2,
  Ticket,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr } from '@/lib/format';

export interface InfluencerCampaignItem {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED';
  pitchNote: string | null;
  promoCode: string | null;
  rejectionReason: string | null;
  clicksCount?: number;
  conversionRatePercent?: number;
  totalSalesCount: number;
  totalUnitsSold: number;
  totalGrossSalesPaise: number;
  totalCommissionPaise: number;
  productTitle: string;
  productSlug: string;
  externalProductUrl: string | null;
  retailPricePaise: number;
  commissionType: 'FIXED_PER_SALE' | 'PERCENTAGE';
  commissionFixedPaise: number | null;
  commissionPercent: number | null;
  buyerDiscountPercent: number;
  brandName: string;
  businessSlug: string;
}

export function InfluencerCampaignsClient({
  items,
}: {
  items: InfluencerCampaignItem[];
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { notify } = useToast();

  function copyWithToast(key: string, text: string, label: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
    notify(label, 'success');
  }

  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((c) => {
        const payoutText =
          c.commissionType === 'FIXED_PER_SALE'
            ? `${formatInr(c.commissionFixedPaise)} / unit sold`
            : `${c.commissionPercent}% commission`;

        const trackedShortLink = c.promoCode ? `${origin}/r/${c.promoCode}` : '';
        const socialCaption = c.promoCode
          ? `Loving ${c.productTitle} from ${c.brandName}! ${
              c.buyerDiscountPercent > 0
                ? `Use my code ${c.promoCode} for ${c.buyerDiscountPercent}% OFF`
                : `Checkout with my promo code ${c.promoCode}`
            } 👉 ${trackedShortLink} #ad #collab`
          : '';

        return (
          <div
            key={c.id}
            className="surface-card flex flex-col justify-between space-y-4 p-6"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/brands/${c.businessSlug}`}
                  className="text-xs font-bold text-ink-500 hover:text-brand-700 hover:underline"
                >
                  {c.brandName}
                </Link>
                <StatusBadge status={c.status} />
              </div>

              <h3 className="text-lg font-extrabold text-ink-950">
                <Link href={`/products/${c.productSlug}`} className="hover:text-brand-700">
                  {c.productTitle}
                </Link>
              </h3>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-800">
                  You earn: {payoutText}
                </span>
                {c.buyerDiscountPercent > 0 ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-bold text-amber-900">
                    Followers get {c.buyerDiscountPercent}% OFF
                  </span>
                ) : null}
              </div>
            </div>

            {c.status === 'APPROVED' && c.promoCode ? (
              <div className="space-y-3 rounded-2xl border-2 border-emerald-600 bg-emerald-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold text-emerald-800 uppercase">
                      <Ticket className="mr-1 inline h-3.5 w-3.5" />
                      Your Social Media Promo Code
                    </p>
                    <code className="font-mono text-xl font-black tracking-wider text-ink-950">
                      {c.promoCode}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyWithToast(
                        `code-${c.id}`,
                        c.promoCode!,
                        `Copied promo code ${c.promoCode}!`
                      )
                    }
                    className="btn-primary py-2 text-xs"
                  >
                    {copiedKey === `code-${c.id}` ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span>
                      {copiedKey === `code-${c.id}` ? 'Copied' : 'Copy Code'}
                    </span>
                  </button>
                </div>

                {/* Tracked Link + Ready-to-Post Caption */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      copyWithToast(
                        `link-${c.id}`,
                        trackedShortLink,
                        'Copied tracked short-link!'
                      )
                    }
                    className="btn-secondary py-1.5 text-xs"
                  >
                    <Link2 className="h-3.5 w-3.5 text-brand-700" />
                    <span>
                      {copiedKey === `link-${c.id}`
                        ? 'Link Copied!'
                        : `Copy Tracked Link (/r/${c.promoCode})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      copyWithToast(
                        `cap-${c.id}`,
                        socialCaption,
                        'Copied ASCI-compliant caption (#ad)!'
                      )
                    }
                    className="btn-secondary py-1.5 text-xs"
                  >
                    <Share2 className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Copy Caption (#ad)</span>
                  </button>
                </div>

                {c.externalProductUrl ? (
                  <a
                    href={`/r/${c.promoCode}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                  >
                    <span>Test tracked redirect link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            ) : c.status === 'PENDING' ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950">
                Waiting for <strong>{c.brandName}</strong> to approve your request and issue your promo code.
              </div>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900">
                {c.rejectionReason || 'Campaign paused or not approved.'}
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 border-t border-ink-100 pt-3 text-center text-xs">
              <div>
                <p className="text-[11px] text-ink-500">
                  <MousePointerClick className="mr-0.5 inline h-3 w-3" />
                  Clicks
                </p>
                <p className="font-extrabold text-ink-950">{c.clicksCount ?? 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-ink-500">Orders</p>
                <p className="font-extrabold text-ink-950">
                  {c.totalSalesCount} ({c.totalUnitsSold}u)
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-500">Conv %</p>
                <p className="font-extrabold text-brand-700">
                  {c.conversionRatePercent ?? 0}%
                </p>
              </div>
              <div>
                <p className="text-[11px] text-ink-500">Earned</p>
                <p className="font-extrabold text-emerald-700">
                  {formatInr(c.totalCommissionPaise)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
