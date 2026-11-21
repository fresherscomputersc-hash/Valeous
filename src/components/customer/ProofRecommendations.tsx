'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { OfferMatchCard, type CustomerOffer } from '@/components/customer/OfferMatchCard';

export function ProofRecommendations({ limit = 3 }: { limit?: number }) {
  const { notify } = useToast();
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, passRes] = await Promise.all([
        fetch(`/api/customer/recommendations?limit=${limit}`, {
          credentials: 'include',
        }),
        fetch('/api/customer/passport', { credentials: 'include' }),
      ]);
      const recData = await recRes.json().catch(() => null);
      const passData = await passRes.json().catch(() => null);
      if (recRes.ok) setOffers(recData.recommendations || []);
      if (passRes.ok && passData?.passport?.savedOffers) {
        setSavedIds(new Set(passData.passport.savedOffers.map((o: CustomerOffer) => o.id)));
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveOffer(offer: CustomerOffer) {
    setSavingId(offer.id);
    try {
      const res = await fetch('/api/customer/passport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId: offer.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notify(data?.error?.message || 'Could not save offer', 'error');
        return;
      }
      setSavedIds(new Set(data.passport.savedOffers.map((o: CustomerOffer) => o.id)));
      notify('Saved to your Value Passport', 'success');
    } catch {
      notify('Network error while saving offer', 'error');
    } finally {
      setSavingId(null);
    }
  }

  async function unsaveOffer(offer: CustomerOffer) {
    setSavingId(offer.id);
    try {
      const res = await fetch(
        `/api/customer/passport?productId=${encodeURIComponent(offer.id)}`,
        { method: 'DELETE', credentials: 'include' }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notify(data?.error?.message || 'Could not remove offer', 'error');
        return;
      }
      setSavedIds(new Set(data.passport.savedOffers.map((o: CustomerOffer) => o.id)));
      notify('Removed from your Value Passport', 'info');
    } catch {
      notify('Network error while removing offer', 'error');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-xs text-ink-500">Finding proof-backed offers…</div>;
  }

  if (offers.length === 0) {
    return (
      <div className="surface-card p-6 text-center text-xs text-ink-600">
        Add interests to your profile to unlock proof-based recommendations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-950">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          Proof-Based Recommendations
        </h2>
        <p className="mt-1 text-xs text-ink-600">
          Offers backed by active creators, real discounts, and your stated interests.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <OfferMatchCard
            key={offer.id}
            offer={offer}
            saved={savedIds.has(offer.id)}
            saving={savingId === offer.id}
            onSave={saveOffer}
            onUnsave={unsaveOffer}
          />
        ))}
      </div>
    </div>
  );
}
