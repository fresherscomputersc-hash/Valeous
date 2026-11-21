'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import {
  BusinessProductsTable,
  type BusinessProductRow,
} from '@/features/business/BusinessProductsTable';

export default function BusinessProductsPage() {
  const [items, setItems] = useState<BusinessProductRow[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/business/products', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.products || []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!items) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading your product campaigns…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">My Product Campaigns</h1>
          <p className="mt-1 text-xs text-ink-600">
            Manage retail pricing, creator commission rates, and buyer discounts.
          </p>
        </div>

        <Link href="/business/products/new" className="btn-primary text-xs">
          <PlusCircle className="h-4 w-4" />
          <span>Post New Product</span>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="surface-card p-8 text-center text-xs text-ink-600">
          You haven’t listed any products yet. Click <strong>Post New Product</strong> to create your first influencer campaign.
        </div>
      ) : (
        <BusinessProductsTable items={items} />
      )}
    </div>
  );
}
