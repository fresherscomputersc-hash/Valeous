import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Sparkles, Store, Tag, Users } from 'lucide-react';
import { getCurrentActor } from '@/server/auth/session';
import { getProductDetailBySlug } from '@/server/services/marketplace.service';
import { EnrollProductWidget } from '@/components/marketplace/EnrollProductWidget';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatInr } from '@/lib/format';
import { AppError } from '@/lib/errors';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const p = await getProductDetailBySlug(slug, null);
    return {
      title: `${p.title} — ${p.brandName} Creator Campaign`,
      description: p.description.slice(0, 155),
      openGraph: {
        title: `${p.title} | ${p.brandName}`,
        description: `Earn ${formatInr(p.estimatedUnitCommissionPaise)}/sale promoting ${p.title} on VALUEOUS.`,
      },
    };
  } catch {
    return { title: 'Product Campaign' };
  }
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ promo?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const actor = await getCurrentActor();

  let product;
  try {
    product = await getProductDetailBySlug(
      slug,
      actor?.influencerProfile?.id ?? null
    );
  } catch (err) {
    if (err instanceof AppError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const ownsThisProduct = actor?.businessProfile?.id === product.businessId;
  const commissionHeadline =
    product.commissionType === 'FIXED_PER_SALE'
      ? `${formatInr(product.commissionFixedPaise)} flat per unit sold`
      : `${product.commissionPercent}% of every sale (~${formatInr(product.estimatedUnitCommissionPaise)} per unit)`;

  return (
    <div className="space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-600 hover:text-ink-950"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Products Marketplace</span>
      </Link>

      {sp.promo ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-xs text-emerald-950">
          Creator Promo Code Applied: <strong className="font-mono">{sp.promo}</strong>
          {product.buyerDiscountPercent > 0
            ? ` — Use this code at checkout for ${product.buyerDiscountPercent}% OFF!`
            : ''}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Product Overview */}
        <div className="space-y-6 lg:col-span-7">
          <div className="surface-card overflow-hidden">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.imageAlt || product.title}
                className="aspect-[16/10] w-full object-cover"
              />
            ) : null}

            <div className="space-y-4 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-800">
                  {product.categoryName}
                </span>
                <StatusBadge status={product.status} />
                <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                  <Users className="h-3.5 w-3.5" />
                  <span>{product.activeInfluencersCount} active influencers</span>
                </span>
              </div>

              <h1 className="text-2xl font-extrabold text-ink-950 sm:text-3xl">
                {product.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Link
                  href={`/brands/${product.businessSlug}`}
                  className="inline-flex items-center gap-1.5 font-bold text-brand-700 hover:underline"
                >
                  <Store className="h-4 w-4" />
                  <span>{product.brandName}</span>
                </Link>
                <span className="text-ink-400">•</span>
                <span className="font-semibold text-ink-800">
                  Retail Price: {formatInr(product.retailPricePaise)}
                </span>
                {product.externalProductUrl ? (
                  <a
                    href={product.externalProductUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-ink-600 hover:text-brand-700 hover:underline"
                  >
                    <span>Product store page</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>

              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {product.description}
              </p>
            </div>
          </div>

          {/* Earnings Simulator */}
          <div className="surface-card p-6">
            <h2 className="text-base font-extrabold text-ink-950">
              How Much Can You Earn Promoting This Product?
            </h2>
            <p className="mt-1 text-xs text-ink-600">
              Estimated influencer commission based on number of sales using your promo code:
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[10, 50, 200].map((salesCount) => (
                <div
                  key={salesCount}
                  className="rounded-2xl border border-ink-200 bg-ink-50/60 p-3.5"
                >
                  <p className="text-xs font-semibold text-ink-500">
                    {salesCount} promo sales
                  </p>
                  <p className="mt-1 text-lg font-black text-emerald-700">
                    {formatInr(product.estimatedUnitCommissionPaise * salesCount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Commission Terms + Enrollment Action */}
        <div className="space-y-6 lg:col-span-5">
          <div className="surface-card space-y-4 border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white p-6">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-emerald-800 uppercase">
              <Sparkles className="h-4 w-4" />
              <span>Creator Commission Offer</span>
            </div>

            <div>
              <p className="text-2xl font-black text-ink-950">{commissionHeadline}</p>
              {product.buyerDiscountPercent > 0 ? (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900">
                  <Tag className="h-3.5 w-3.5" />
                  <span>
                    Followers get {product.buyerDiscountPercent}% OFF at checkout with your code
                  </span>
                </p>
              ) : null}
            </div>

            <ul className="space-y-1.5 border-t border-emerald-100 pt-3 text-xs text-ink-600">
              <li>
                • Clean promo code + tracked `/r/CODE` short-link issued upon approval
              </li>
              <li>
                • Supports Shopify/Checkout automatic webhook sync &amp; CSV batching
              </li>
              <li>• Withdraw verified commissions to UPI or Bank IMPS anytime</li>
            </ul>
          </div>

          <EnrollProductWidget
            productId={product.id}
            businessId={product.businessId}
            productTitle={product.title}
            brandName={product.brandName}
            buyerDiscountPercent={product.buyerDiscountPercent}
            productStatus={product.status as 'ACTIVE' | 'PAUSED' | 'ENDED'}
            actorRole={actor?.user.role ?? null}
            ownsThisProduct={ownsThisProduct}
            existingEnrollment={product.viewerEnrollment}
          />
        </div>
      </div>
    </div>
  );
}
