import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Tag, Users } from 'lucide-react';
import { formatInr } from '@/lib/format';

export interface ProductCardItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string | null;
  retailPricePaise: number;
  commissionType: 'FIXED_PER_SALE' | 'PERCENTAGE';
  commissionFixedPaise: number | null;
  commissionPercent: number | null;
  buyerDiscountPercent: number;
  estimatedUnitCommissionPaise: number;
  categoryName: string;
  brandName: string;
  businessSlug: string;
  activeInfluencersCount?: number;
}

export function ProductCard({ item }: { item: ProductCardItem }) {
  const commissionLabel =
    item.commissionType === 'FIXED_PER_SALE'
      ? `${formatInr(item.commissionFixedPaise)} / sale`
      : `${item.commissionPercent}% commission (~${formatInr(item.estimatedUnitCommissionPaise)}/sale)`;

  return (
    <article className="surface-card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/products/${item.slug}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-ink-100"
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.imageAlt || item.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-semibold text-ink-400">
            Product Campaign
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-ink-900 shadow-sm">
            {item.categoryName}
          </span>
          {item.buyerDiscountPercent > 0 ? (
            <span className="rounded-full bg-ink-950/90 px-2.5 py-1 text-[11px] font-bold text-amber-300 shadow-sm">
              Buyers get {item.buyerDiscountPercent}% OFF
            </span>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
          <Link
            href={`/brands/${item.businessSlug}`}
            className="font-bold text-ink-700 hover:text-brand-700 hover:underline"
          >
            {item.brandName}
          </Link>
          <span>Retail: {formatInr(item.retailPricePaise)}</span>
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-lg font-extrabold text-ink-950 group-hover:text-brand-700">
          <Link href={`/products/${item.slug}`}>{item.title}</Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-600">
          {item.description}
        </p>

        {/* Highlighted Influencer Commission Box */}
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-emerald-800 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Influencer Payout</span>
          </div>
          <p className="mt-0.5 text-sm font-extrabold text-emerald-950">{commissionLabel}</p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3 text-xs">
          <span className="inline-flex items-center gap-1 text-ink-500">
            {typeof item.activeInfluencersCount === 'number' ? (
              <>
                <Users className="h-3.5 w-3.5" />
                <span>
                  {item.activeInfluencersCount}{' '}
                  {item.activeInfluencersCount === 1 ? 'creator' : 'creators'} promoting
                </span>
              </>
            ) : (
              <>
                <Tag className="h-3.5 w-3.5" />
                <span>Promo code campaign</span>
              </>
            )}
          </span>

          <Link
            href={`/products/${item.slug}`}
            className="inline-flex items-center gap-1 font-bold text-brand-700 hover:text-brand-800"
          >
            <span>Enroll &amp; Earn</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
