import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  MousePointerClick,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { AppError } from '@/lib/errors';
import { formatCompactNumber, formatInr } from '@/lib/format';
import { getPublicCreatorPage } from '@/server/services/marketplace.service';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  try {
    const { handle } = await params;
    const data = await getPublicCreatorPage(handle);
    return {
      title: `${data.creator.displayName} (@${data.creator.handle}) — Creator Portfolio`,
      description: data.creator.bio.slice(0, 155),
    };
  } catch {
    return { title: 'Creator Portfolio' };
  }
}

export default async function PublicCreatorPortfolioPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  let data;
  try {
    data = await getPublicCreatorPage(handle);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const { creator, stats, activeCampaigns } = data;

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-ink-950"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Marketplace</span>
      </Link>

      {/* Creator Header */}
      <section className="surface-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{creator.niche}</span>
              </span>
              {creator.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Verified Creator</span>
                </span>
              ) : null}
            </div>

            <h1 className="text-3xl font-extrabold text-ink-950">
              {creator.displayName}{' '}
              <span className="text-lg font-semibold text-ink-500">
                @{creator.handle}
              </span>
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-ink-700">
              {creator.bio}
            </p>

            <div className="flex flex-wrap gap-4 pt-1 text-xs">
              {creator.instagramUrl ? (
                <a
                  href={creator.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-brand-700 hover:underline"
                >
                  <span>Instagram</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {creator.youtubeUrl ? (
                <a
                  href={creator.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-brand-700 hover:underline"
                >
                  <span>YouTube Channel</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-ink-200 bg-ink-50/60 px-4 py-3">
              <p className="text-[11px] font-semibold text-ink-500">Audience</p>
              <p className="mt-1 text-lg font-black text-ink-950">
                {formatCompactNumber(creator.followerCount)}
              </p>
            </div>
            <div className="rounded-2xl border border-ink-200 bg-ink-50/60 px-4 py-3">
              <p className="text-[11px] font-semibold text-ink-500">Link Clicks</p>
              <p className="mt-1 text-lg font-black text-ink-950">
                {stats.totalLinkClicks}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
              <p className="text-[11px] font-semibold text-emerald-800">
                Verified Orders
              </p>
              <p className="mt-1 text-lg font-black text-emerald-900">
                {stats.totalVerifiedSales}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Active Brand Collaborations */}
      <section className="space-y-4">
        <h2 className="text-xl font-extrabold text-ink-950">
          Active Brand Picks &amp; Follower Promo Codes ({activeCampaigns.length})
        </h2>

        {activeCampaigns.length === 0 ? (
          <div className="surface-card p-8 text-center text-xs text-ink-600">
            No active public product codes listed right now.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {activeCampaigns.map((c: { enrollmentId: string; businessSlug: string; brandName: string; productSlug: string; productTitle: string; retailPricePaise: number; buyerDiscountPercent: number; promoCode: string | null; clicksCount: number; totalSalesCount: number }) => (
              <div key={c.enrollmentId} className="surface-card space-y-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/brands/${c.businessSlug}`}
                      className="text-xs font-bold text-ink-500 hover:text-brand-700 hover:underline"
                    >
                      {c.brandName}
                    </Link>
                    <h3 className="mt-0.5 text-base font-extrabold text-ink-950">
                      <Link
                        href={`/products/${c.productSlug}`}
                        className="hover:text-brand-700"
                      >
                        {c.productTitle}
                      </Link>
                    </h3>
                    <p className="mt-1 text-xs text-ink-600">
                      Retail: {formatInr(c.retailPricePaise)}
                      {c.buyerDiscountPercent > 0
                        ? ` • ${c.buyerDiscountPercent}% OFF with code`
                        : ''}
                    </p>
                  </div>

                  {c.promoCode ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-right">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase">
                        <Ticket className="mr-0.5 inline h-3 w-3" />
                        Code
                      </p>
                      <p className="font-mono text-sm font-black text-ink-950">
                        {c.promoCode}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-ink-500">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    {c.clicksCount} clicks · {c.totalSalesCount} orders
                  </span>
                  {c.promoCode ? (
                    <a
                      href={`/r/${c.promoCode}`}
                      className="btn-primary py-1.5 text-xs"
                    >
                      Shop with {c.promoCode} →
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
