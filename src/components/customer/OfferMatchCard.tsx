'use client';

import React from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, ShieldCheck, Tag, Users } from 'lucide-react';
import { formatInr } from '@/lib/format';

export interface CustomerOffer {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string | null;
  externalProductUrl: string | null;
  retailPricePaise: number;
  discountedPricePaise: number;
  commissionType: string;
  commissionFixedPaise: number | null;
  commissionPercent: number | null;
  buyerDiscountPercent: number;
  promoCodePrefix: string | null;
  categoryName: string;
  categorySlug: string;
  businessId: string;
  brandName: string;
  businessSlug: string;
  businessCity: string;
  activeInfluencersCount: number;
  estimatedUnitCommissionPaise: number;
  verifiedSalesCount?: number;
  verifiedClicksCount?: number;
  matchScore: number;
  matchReasons: string[];
}

export function OfferMatchCard({
  offer,
  saved,
  onSave,
  onUnsave,
  onRequest,
  saving,
  compact = false,
}: {
  offer: CustomerOffer;
  saved: boolean;
  onSave?: (offer: CustomerOffer) => void;
  onUnsave?: (offer: CustomerOffer) => void;
  onRequest?: (offer: CustomerOffer) => void;
  saving?: boolean;
  compact?: boolean;
}) {
  return (
    <article className="surface-card flex h-full flex-col overflow-hidden">
      <div className="relative h-40 w-full bg-ink-100">
        {offer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.imageUrl}
            alt={offer.imageAlt || offer.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-400">
            <Tag className="h-8 w-8" />
          </div>
        )}
        {offer.buyerDiscountPercent > 0 ? (
          <span className="absolute left-2 top-2 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-extrabold text-white">
            {offer.buyerDiscountPercent}% OFF
          </span>
        ) : null}
        <button
          type="button"
          aria-label={saved ? 'Remove from passport' : 'Save to passport'}
          onClick={() => (saved ? onUnsave?.(offer) : onSave?.(offer))}
          disabled={saving}
          className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-ink-800 shadow-sm transition hover:bg-white disabled:opacity-60"
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4 text-brand-700" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">
          {offer.categoryName}
        </p>
        <h3 className="mt-1 line-clamp-2 text-sm font-extrabold text-ink-950">
          {offer.title}
        </h3>
        <p className="mt-0.5 text-[11px] text-ink-500">
          by {offer.brandName} · {offer.businessCity}
        </p>

        {!compact ? (
          <p className="mt-2 line-clamp-2 text-xs text-ink-600">{offer.description}</p>
        ) : null}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base font-extrabold text-ink-950">
            {formatInr(offer.discountedPricePaise)}
          </span>
          {offer.buyerDiscountPercent > 0 ? (
            <span className="text-xs text-ink-400 line-through">
              {formatInr(offer.retailPricePaise)}
            </span>
          ) : null}
        </div>

        {offer.matchReasons.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {offer.matchReasons.slice(0, 3).map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-1.5 text-[11px] text-ink-600"
              >
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {offer.activeInfluencersCount > 0 ||
        (offer.verifiedSalesCount ?? 0) > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-ink-500">
            {offer.activeInfluencersCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                {offer.activeInfluencersCount} active creator
                {offer.activeInfluencersCount === 1 ? '' : 's'}
              </span>
            ) : null}
            {(offer.verifiedSalesCount ?? 0) > 0 ? (
              <span className="flex items-center gap-1.5 text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                {offer.verifiedSalesCount} verified sale
                {offer.verifiedSalesCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-4">
          {onRequest ? (
            <button
              type="button"
              onClick={() => onRequest(offer)}
              className="btn-primary flex-1 justify-center py-2 text-[11px]"
            >
              Request Offer
            </button>
          ) : null}
          <a
            href={offer.externalProductUrl || `/products/${offer.slug}`}
            target={offer.externalProductUrl ? '_blank' : undefined}
            rel={offer.externalProductUrl ? 'noopener noreferrer' : undefined}
            className="btn-secondary justify-center py-2 text-[11px]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>View</span>
          </a>
        </div>
      </div>
    </article>
  );
}
