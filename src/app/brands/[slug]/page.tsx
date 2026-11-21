import React from 'react';
import { notFound } from 'next/navigation';
import { ExternalLink, MapPin } from 'lucide-react';
import { getPublicBrandPage } from '@/server/services/marketplace.service';
import { ProductCard, type ProductCardItem } from '@/components/marketplace/ProductCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppError } from '@/lib/errors';

export default async function PublicBrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let data;
  try {
    data = await getPublicBrandPage(slug);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <div className="space-y-8">
      <section className="surface-card p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold text-ink-950">{data.brand.brandName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-ink-600">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span>{data.brand.city}</span>
          </span>
          {data.brand.websiteUrl ? (
            <a
              href={data.brand.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
            >
              <span>{data.brand.websiteUrl}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-700">
          {data.brand.description}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-extrabold text-ink-950">
          Active Influencer Campaigns ({data.products.length})
        </h2>
        {data.products.length === 0 ? (
          <EmptyState
            title="No active products listed"
            description="This business does not have open influencer campaigns right now."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.products.map((p) => (
              <ProductCard
                key={p.id}
                item={{
                  ...p,
                  brandName: data.brand.brandName,
                  businessSlug: data.brand.slug,
                } as ProductCardItem}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
