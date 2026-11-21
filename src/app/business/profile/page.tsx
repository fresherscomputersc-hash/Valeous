'use client';

import React, { useEffect, useState } from 'react';
import { BusinessProfileEditor } from '@/features/business/BusinessProfileEditor';

export default function BusinessProfilePage() {
  const [data, setData] = useState<{
    profile: {
      brandName: string;
      slug: string;
      categoryId: string | null;
      description: string;
      websiteUrl: string | null;
      city: string;
      gstin?: string | null;
    };
    categories: Array<{ id: string; name: string }>;
  } | null>(null);

  useEffect(() => {
    fetch('/api/business/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading brand profile…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Brand Profile &amp; GSTIN</h1>
        <p className="mt-1 text-xs text-ink-600">
          Public storefront URL: <span className="font-mono">/brands/{data.profile.slug}</span>
        </p>
      </div>

      <BusinessProfileEditor profile={data.profile} categories={data.categories} />
    </div>
  );
}
