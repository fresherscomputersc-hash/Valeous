'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { OfferMatchCard, type CustomerOffer } from '@/components/customer/OfferMatchCard';
import { CustomerRequestForm } from '@/components/customer/CustomerRequestForm';

interface Passport {
  interests: string[];
  requests: unknown[];
  savedOffers: CustomerOffer[];
}

export function CustomerOfferExplorer() {
  const { notify } = useToast();
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeOffer, setActiveOffer] = useState<CustomerOffer | null>(null);

  const savedIds = useMemo(
    () => new Set((passport?.savedOffers || []).map((o) => o.id)),
    [passport]
  );

  const loadOffers = useCallback(
    async (params?: { q?: string; sort?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const sp = new URLSearchParams();
        if (params?.q) sp.set('q', params.q);
        if (params?.sort) sp.set('sort', params.sort);
        sp.set('limit', '12');
        const res = await fetch(`/api/customer/offers?${sp.toString()}`, {
          credentials: 'include',
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error?.message || 'Could not load offers');
          return;
        }
        setOffers(data.offers || []);
      } catch {
        setError('Network error while loading offers');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadPassport = useCallback(async () => {
    try {
      const res = await fetch('/api/customer/passport', { credentials: 'include' });
      const data = await res.json().catch(() => null);
      if (res.ok) setPassport(data.passport);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    void loadOffers();
    void loadPassport();
  }, [loadOffers, loadPassport]);

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
      setPassport(data.passport);
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
      setPassport(data.passport);
      notify('Removed from your Value Passport', 'info');
    } catch {
      notify('Network error while removing offer', 'error');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-950">
              <Sparkles className="h-5 w-5 text-brand-600" />
              Need-to-Offer Matching
            </h2>
            <p className="mt-1 text-xs text-ink-600">
              Tell us what you need. We match live offers from businesses and creators
              using your interests, city, discounts, and proof signals.
            </p>
          </div>
          {passport && passport.interests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void loadOffers({ q, sort });
          }}
          className="mt-4 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-[200px] flex-1">
            <label htmlFor="offer-search" className="label-text">
              Search offers
            </label>
            <input
              id="offer-search"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Skincare, cafés, fitness…"
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="offer-sort" className="label-text">
              Sort
            </label>
            <select
              id="offer-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                void loadOffers({ q, sort: e.target.value });
              }}
              className="input-field"
            >
              <option value="">Best match</option>
              <option value="highest_payout">Highest payout</option>
              <option value="popular">Most popular</option>
            </select>
          </div>
          <button type="submit" className="btn-primary text-xs">
            <Search className="h-4 w-4" />
            <span>Match</span>
          </button>
        </form>
      </div>

      {error ? (
        <div className="surface-card p-4 text-xs text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="py-10 text-center text-xs text-ink-500">
          Matching offers to your needs…
        </div>
      ) : offers.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="text-sm font-bold text-ink-950">No matches yet</p>
          <p className="mt-1 text-xs text-ink-600">
            Add interests in your profile or send a custom request below.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <OfferMatchCard
              key={offer.id}
              offer={offer}
              saved={savedIds.has(offer.id)}
              saving={savingId === offer.id}
              onSave={saveOffer}
              onUnsave={unsaveOffer}
              onRequest={setActiveOffer}
            />
          ))}
        </div>
      )}

      {activeOffer ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-ink-950">Request this offer</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setActiveOffer(null)}
                className="rounded-lg p-1 text-ink-500 hover:bg-ink-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <CustomerRequestForm
                offer={activeOffer}
                onSubmitted={() => {
                  setActiveOffer(null);
                  void loadPassport();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
