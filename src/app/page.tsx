import React from 'react';
import Link from 'next/link';
import { Briefcase, CheckCircle2, Search, Sparkles, Ticket, Wallet } from 'lucide-react';
import {
  listAllCategories,
  listMarketplaceProductsPaginated,
} from '@/server/services/marketplace.service';
import { ProductCard, type ProductCardItem } from '@/components/marketplace/ProductCard';
import { HeroCtaButtons } from '@/components/marketplace/HeroCtaButtons';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function HomeMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    commissionType?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const pageNum = Math.max(1, Number(sp.page) || 1);

  const [categories, paginated] = await Promise.all([
    listAllCategories(),
    listMarketplaceProductsPaginated({
      q: sp.q,
      categorySlug: sp.category,
      commissionType: sp.commissionType,
      sort: sp.sort,
      page: pageNum,
      pageSize: 9,
    }),
  ]);

  function buildPageHref(targetPage: number) {
    const p = new URLSearchParams();
    if (sp.q) p.set('q', sp.q);
    if (sp.category) p.set('category', sp.category);
    if (sp.commissionType) p.set('commissionType', sp.commissionType);
    if (sp.sort) p.set('sort', sp.sort);
    if (targetPage > 1) p.set('page', String(targetPage));
    const qs = p.toString();
    return qs ? `/?${qs}` : '/';
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-ink-200 bg-gradient-to-br from-ink-950 via-ink-900 to-brand-950 px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-brand-200">
            <Sparkles className="h-3.5 w-3.5" />
            <span>VALUEOUS — Customer × Creator × Business</span>
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Trusted creators recommend. Customers discover. Businesses grow.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-200 sm:text-base">
            Customers find products curated by creators they trust. Creators enroll, share tracked codes + links, and withdraw verified earnings to UPI. Businesses fund campaign wallets and pay only for tracked outcomes.
          </p>

          <HeroCtaButtons />
        </div>

        {/* 4 Simple Steps */}
        <div className="mt-10 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-4">
          {[
            {
              icon: Briefcase,
              step: '1. Business Lists Product',
              desc: 'Sets product price, buyer discount, and ₹ or % influencer payout.',
            },
            {
              icon: CheckCircle2,
              step: '2. Influencer Enrolls',
              desc: 'Picks any product to promote and gets approved by the business.',
            },
            {
              icon: Ticket,
              step: '3. Tracked Code + Link',
              desc: 'Gets a clean code (like GLOW-ANANYA) + tracked /r/CODE link.',
            },
            {
              icon: Wallet,
              step: '4. Paid Per Sale',
              desc: 'Store webhooks, CSV, or manual logs credit UPI wallets with UTR slips.',
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <s.icon className="h-5 w-5 text-brand-300" />
              <p className="mt-2 text-xs font-extrabold text-white">{s.step}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-300">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section aria-label="Filter product campaigns" className="surface-card p-5">
        <form method="get" action="/" className="grid gap-3 sm:grid-cols-12">
          <div className="relative sm:col-span-4">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              name="q"
              defaultValue={sp.q || ''}
              placeholder="Search products or brands…"
              className="input-field pl-9"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              name="category"
              aria-label="Category"
              defaultValue={sp.category || ''}
              className="input-field"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              name="commissionType"
              aria-label="Commission model"
              defaultValue={sp.commissionType || ''}
              className="input-field"
            >
              <option value="">Any payout model</option>
              <option value="FIXED_PER_SALE">Fixed ₹ per sale</option>
              <option value="PERCENTAGE">% Commission</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              name="sort"
              aria-label="Sort campaigns"
              defaultValue={sp.sort || 'newest'}
              className="input-field"
            >
              <option value="newest">Newest first</option>
              <option value="highest_payout">Highest payout / sale</option>
              <option value="popular">Most creators enrolled</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <button type="submit" className="btn-primary w-full justify-center py-2.5">
              Go
            </button>
          </div>
        </form>
      </section>

      {/* Product Campaign Grid */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold text-ink-950">
              Open Product Campaigns ({paginated.totalCount})
            </h2>
            <p className="text-xs text-ink-600">
              Pick a product, check how much you earn per sale, and enroll to receive your personal promo code.
            </p>
          </div>
          {sp.q || sp.category || sp.commissionType ? (
            <Link href="/" className="text-xs font-bold text-brand-700 hover:underline">
              Clear filters
            </Link>
          ) : null}
        </div>

        {paginated.items.length === 0 ? (
          <EmptyState
            title="No matching product campaigns"
            description="Try clearing your search filters, or sign in as a Business to list a new product."
            actionHref="/"
            actionLabel="Show All Products"
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.items.map((item) => (
                <ProductCard key={item.id} item={item as ProductCardItem} />
              ))}
            </div>

            {paginated.totalPages > 1 ? (
              <div className="flex items-center justify-between pt-4 text-xs">
                <span className="text-ink-500">
                  Page {paginated.page} of {paginated.totalPages} ({paginated.totalCount}{' '}
                  campaigns)
                </span>
                <div className="flex gap-2">
                  {paginated.page > 1 ? (
                    <Link
                      href={buildPageHref(paginated.page - 1)}
                      className="btn-secondary py-1.5 text-xs"
                    >
                      ← Previous
                    </Link>
                  ) : null}
                  {paginated.page < paginated.totalPages ? (
                    <Link
                      href={buildPageHref(paginated.page + 1)}
                      className="btn-secondary py-1.5 text-xs"
                    >
                      Next →
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
