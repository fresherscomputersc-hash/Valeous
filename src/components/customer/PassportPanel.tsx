'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Compass } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { OfferMatchCard, type CustomerOffer } from '@/components/customer/OfferMatchCard';

interface Passport {
  interests: string[];
  requests: unknown[];
  savedOffers: CustomerOffer[];
}

export function PassportPanel() {
  const { notify } = useToast();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer/passport', { credentials: 'include' });
      const data = await res.json().catch(() => null);
      if (res.ok) setPassport(data.passport);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      setPassport(data.passport);
      notify('Removed from your Value Passport', 'info');
    } catch {
      notify('Network error while removing offer', 'error');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-xs text-ink-500">Loading your passport…</div>;
  }

  const savedOffers = passport?.savedOffers || [];

  return (
    <div className="space-y-5">
      <div className="surface-card p-5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-950">
          <Bookmark className="h-5 w-5 text-brand-600" />
          Smart Value Passport
        </h2>
        <p className="mt-1 text-xs text-ink-600">
          Every offer you save stays here with live pricing, discounts, and proof. Use it
          at checkout or when you are ready to buy.
        </p>
        {passport && passport.interests.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {passport.interests.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-customer px-2.5 py-1 text-[10px] font-bold text-brand-800"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {savedOffers.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-brand-300" />
          <p className="mt-2 text-sm font-bold text-ink-950">Your passport is empty</p>
          <p className="mt-1 text-xs text-ink-600">
            Browse matched offers and tap the bookmark to save them here.
          </p>
          <Link href="/customer/offers" className="btn-primary mt-4 inline-flex text-xs">
            <Compass className="h-4 w-4" />
            <span>Explore Offers</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedOffers.map((offer) => (
            <OfferMatchCard
              key={offer.id}
              offer={offer}
              saved
              saving={savingId === offer.id}
              onUnsave={unsaveOffer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
