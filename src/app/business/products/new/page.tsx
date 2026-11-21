'use client';

import React, { useEffect, useState } from 'react';
import { ProductCampaignForm } from '@/features/business/ProductCampaignForm';

export default function NewBusinessProductPage() {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }> | null>(
    null
  );

  useEffect(() => {
    fetch('/api/business/products', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setCategories(d.categories || []);
      })
      .catch(() => {});
  }, []);

  if (!categories) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading product campaign form…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Post a Product for Influencers to Promote
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Configure either a fixed ₹ payout per sale or a percentage (%) commission, plus an optional buyer discount %.
        </p>
      </div>

      <ProductCampaignForm categories={categories} />
    </div>
  );
}
