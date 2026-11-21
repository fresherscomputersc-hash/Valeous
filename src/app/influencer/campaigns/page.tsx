'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  InfluencerCampaignsClient,
  type InfluencerCampaignItem,
} from '@/features/influencer/InfluencerCampaignsClient';

export default function InfluencerCampaignsPage() {
  const [campaigns, setCampaigns] = useState<InfluencerCampaignItem[] | null>(null);

  useEffect(() => {
    fetch('/api/influencer/dashboard', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setCampaigns(d.campaigns || []);
      })
      .catch(() => {});
  }, []);

  if (!campaigns) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading your promo codes…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">
            My Promo Codes &amp; Tracked Short-Links
          </h1>
          <p className="mt-1 text-xs text-ink-600">
            Copy your promo code, tracked `/r/CODE` link, or ready-to-post ASCI `#ad` caption in one click.
          </p>
        </div>

        <Link href="/" className="btn-primary text-xs">
          + Enroll in More Products
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="surface-card p-8 text-center text-xs text-ink-600">
          No enrolled campaigns yet. Browse the Marketplace to request your first promo code.
        </div>
      ) : (
        <InfluencerCampaignsClient items={campaigns} />
      )}
    </div>
  );
}
