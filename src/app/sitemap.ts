import type { MetadataRoute } from 'next';
import { getEnv } from '@/lib/env';
import { listMarketplaceProducts } from '@/server/services/marketplace.service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getEnv().APP_BASE_URL;
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/how-it-works`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/pricing`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/terms`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const products = await listMarketplaceProducts({});
    const productUrls: MetadataRoute.Sitemap = products.map((p: { slug: string; createdAt: string }) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: 'daily',
      priority: 0.9,
    }));
    return [...staticPages, ...productUrls];
  } catch {
    return staticPages;
  }
}
