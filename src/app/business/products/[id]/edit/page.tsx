'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ProductCampaignForm,
  type ProductFormInitial,
} from '@/features/business/ProductCampaignForm';

export default function EditBusinessProductPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const [data, setData] = useState<{
    product: ProductFormInitial;
    categories: Array<{ id: string; name: string }>;
  } | null>(null);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/business/products/${productId}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {});
  }, [productId]);

  if (!data) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading product details…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Edit Product Campaign</h1>
        <p className="mt-1 text-xs text-ink-600">
          Update pricing, commission terms, or campaign status.
        </p>
      </div>

      <ProductCampaignForm categories={data.categories} initial={data.product} />
    </div>
  );
}
