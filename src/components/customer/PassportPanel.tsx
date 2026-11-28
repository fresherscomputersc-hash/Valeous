'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, CheckCircle2, Clock, Compass, Ticket } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { OfferMatchCard, type CustomerOffer } from '@/components/customer/OfferMatchCard';
import { formatInr } from '@/lib/format';

interface Passport {
  interests: string[];
  requests: unknown[];
  savedOffers: CustomerOffer[];
}

type WalletTab = 'available' | 'claimed' | 'expiring' | 'redeemed';

interface WalletPass {
  id: string;
  title: string;
  providerName: string;
  valuePaise: number;
  tab: WalletTab;
  expiresAtIst: string;
  redemptionCode?: string;
}

const INITIAL_WALLET_PASSES: WalletPass[] = [
  {
    id: 'wp-1',
    title: '₹300 Off Recovery Session',
    providerName: 'Prana Studio Indiranagar',
    valuePaise: 30000,
    tab: 'available',
    expiresAtIst: '30 Nov 2026, 11:59 PM IST',
  },
  {
    id: 'wp-2',
    title: 'Complimentary Coastal Mocktail Pairing',
    providerName: 'Tide & Table Bandra',
    valuePaise: 45000,
    tab: 'claimed',
    expiresAtIst: '02 Dec 2026, 10:00 PM IST',
  },
  {
    id: 'wp-3',
    title: '20% Off Mobility Diagnostic (Expiring Tonight)',
    providerName: 'Kinetic Lab Hauz Khas',
    valuePaise: 30000,
    tab: 'expiring',
    expiresAtIst: 'Today, 11:59 PM IST',
  },
];

export function PassportPanel() {
  const { notify } = useToast();
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WalletTab>('available');
  const [walletPasses, setWalletPasses] = useState<WalletPass[]>(INITIAL_WALLET_PASSES);

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

  function handleAtomicRedeem(passId: string) {
    setWalletPasses((prev) =>
      prev.map((p) => {
        if (p.id !== passId) return p;
        if (p.tab === 'redeemed') return p;
        return {
          ...p,
          tab: 'redeemed',
          redemptionCode: `VLS-IST-${passId.toUpperCase()}-${Date.now().toString().slice(-4)}`,
        };
      })
    );
    notify('Offer redeemed atomically (single-use IST token issued)!', 'success');
  }

  const tabCounts = useMemo(
    () => ({
      available: walletPasses.filter((p) => p.tab === 'available').length,
      claimed: walletPasses.filter((p) => p.tab === 'claimed').length,
      expiring: walletPasses.filter((p) => p.tab === 'expiring').length,
      redeemed: walletPasses.filter((p) => p.tab === 'redeemed').length,
    }),
    [walletPasses]
  );

  const visiblePasses = useMemo(
    () => walletPasses.filter((p) => p.tab === activeTab),
    [walletPasses, activeTab]
  );

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  const savedOffers = passport?.savedOffers || [];

  return (
    <div className="space-y-6">
      <div className="surface-card p-5">
        <h1 className="flex items-center gap-2 text-lg font-extrabold text-ink-950">
          <Bookmark className="h-5 w-5 text-brand-600" />
          Smart Value Passport Wallet
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Track available, claimed, expiring (IST), and redeemed single-use offers in one wallet.
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

      {/* 4 Wallet State Tabs */}
      <div className="surface-card space-y-4 p-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Passport wallet states">
          {(
            [
              { key: 'available', label: `Available (${tabCounts.available})` },
              { key: 'claimed', label: `Claimed (${tabCounts.claimed})` },
              { key: 'expiring', label: `Expiring Soon (${tabCounts.expiring})` },
              { key: 'redeemed', label: `Redeemed (${tabCounts.redeemed})` },
            ] as Array<{ key: WalletTab; label: string }>
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={activeTab === t.key}
              onClick={() => setActiveTab(t.key)}
              className={`min-h-[44px] rounded-xl border px-4 text-xs font-bold transition ${
                activeTab === t.key
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-ink-200 bg-white text-ink-800 hover:bg-ink-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {visiblePasses.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-500">
            No passes in this wallet state right now.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visiblePasses.map((pass) => (
              <div
                key={pass.id}
                className="flex flex-col justify-between space-y-3 rounded-xl border border-ink-200 p-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 font-bold text-brand-700">
                      <Ticket className="h-4 w-4" />
                      {formatInr(pass.valuePaise)} value
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                      <Clock className="h-3.5 w-3.5" />
                      {pass.expiresAtIst}
                    </span>
                  </div>
                  <h2 className="text-sm font-extrabold text-ink-950">{pass.title}</h2>
                  <p className="text-ink-600">{pass.providerName}</p>
                  {pass.redemptionCode && (
                    <p className="mt-1 rounded-lg bg-emerald-50 px-3 py-1.5 font-mono text-[11px] font-bold text-emerald-800">
                      Redeemed Token: {pass.redemptionCode}
                    </p>
                  )}
                </div>

                {pass.tab !== 'redeemed' ? (
                  <button
                    type="button"
                    onClick={() => handleAtomicRedeem(pass.id)}
                    className="btn-primary min-h-[44px] w-full text-xs"
                  >
                    Redeem Now (Single-Use IST)
                  </button>
                ) : (
                  <span className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-ink-100 text-xs font-bold text-ink-700">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Single-Use Redeemed
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Marketplace Offers */}
      {savedOffers.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-brand-300" />
          <p className="mt-2 text-sm font-bold text-ink-950">No saved marketplace offers yet</p>
          <p className="mt-1 text-xs text-ink-600">
            Browse matched offers and tap the bookmark to save them here.
          </p>
          <Link href="/customer/offers" className="btn-primary mt-4 inline-flex min-h-[44px] items-center text-xs">
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
