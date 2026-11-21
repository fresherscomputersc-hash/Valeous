import type { MetadataRoute } from 'next';
import { getEnv } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const base = getEnv().APP_BASE_URL;
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/products/', '/brands/', '/creators/', '/how-it-works', '/pricing'],
        disallow: ['/api/', '/business/', '/influencer/', '/admin', '/settings/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
