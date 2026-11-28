'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  List,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { formatInr } from '@/lib/format';

interface ExploreService {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  category?: string;
  city?: string;
  pricePaise: number;
  inclusions: string[];
  exclusions: string[];
  providerName: string;
  cancellationPolicy: string;
  nextAvailableSlot?: string;
  lat?: number;
  lng?: number;
}

const FALLBACK_SERVICES: ExploreService[] = [
  {
    id: 'svc-wellness-01',
    title: 'Ayurvedic Deep Tissue & Recovery Session (60 min)',
    description:
      'Restorative full-body therapy with herbal oils, posture assessment, and post-session hydration.',
    category: 'Wellness',
    city: 'Bengaluru',
    pricePaise: 249900,
    inclusions: ['60-min therapist session', 'Herbal oil blend', 'Post-care tea'],
    exclusions: ['Home visit surcharge', 'Add-on steam room'],
    providerName: 'Prana Studio Indiranagar',
    cancellationPolicy: 'Free cancellation up to 24 hours before slot',
    nextAvailableSlot: 'Today, 4:00 PM IST',
    lat: 12.9716,
    lng: 77.5946,
  },
  {
    id: 'svc-dining-02',
    title: 'Chef’s 5-Course Coastal Tasting Experience',
    description:
      'Curated seasonal tasting menu crafted with sustainably sourced coastal ingredients.',
    category: 'Dining',
    city: 'Mumbai',
    pricePaise: 320000,
    inclusions: ['5-course tasting menu', 'Welcome mocktail', 'Chef table intro'],
    exclusions: ['Alcoholic pairings', 'Valet gratuity'],
    providerName: 'Tide & Table Bandra',
    cancellationPolicy: '50% refund up to 12 hours before reservation',
    nextAvailableSlot: 'Tomorrow, 7:30 PM IST',
    lat: 19.0596,
    lng: 72.8295,
  },
  {
    id: 'svc-fitness-03',
    title: '1-on-1 Mobility & Strength Diagnostic',
    description:
      'Comprehensive movement screening and tailored 4-week training plan with a certified coach.',
    category: 'Fitness',
    city: 'Delhi',
    pricePaise: 149900,
    inclusions: ['45-min assessment', 'Custom PDF plan', 'Locker & shower access'],
    exclusions: ['Follow-up PT sessions'],
    providerName: 'Kinetic Lab Hauz Khas',
    cancellationPolicy: 'Free reschedule up to 6 hours before slot',
    nextAvailableSlot: 'Tomorrow, 9:00 AM IST',
    lat: 28.5494,
    lng: 77.2001,
  },
];

function mapProductToService(raw: Record<string, unknown>): ExploreService {
  const business = (raw.business as Record<string, unknown> | undefined) || {};
  const category = (raw.category as Record<string, unknown> | undefined) || {};
  const pricePaise =
    typeof raw.pricePaise === 'number'
      ? raw.pricePaise
      : typeof raw.price_paise === 'number'
        ? raw.price_paise
        : 199900;

  return {
    id: String(raw.id || raw.slug || Math.random()),
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    title: String(raw.title || raw.name || 'Local Service'),
    description: typeof raw.description === 'string' ? raw.description : '',
    category:
      typeof category.name === 'string'
        ? category.name
        : typeof raw.category === 'string'
          ? raw.category
          : 'General',
    city:
      typeof business.city === 'string'
        ? business.city
        : typeof raw.city === 'string'
          ? raw.city
          : 'Bengaluru',
    pricePaise,
    inclusions: Array.isArray(raw.inclusions)
      ? raw.inclusions.map(String)
      : ['Verified service delivery', 'Instant QR pass check-in'],
    exclusions: Array.isArray(raw.exclusions)
      ? raw.exclusions.map(String)
      : ['Personal add-ons not listed in package'],
    providerName:
      typeof business.brandName === 'string'
        ? business.brandName
        : typeof raw.providerName === 'string'
          ? raw.providerName
          : 'VALUEOUS Partner',
    cancellationPolicy:
      typeof raw.cancellationPolicy === 'string'
        ? raw.cancellationPolicy
        : 'Free cancellation up to 24 hours before scheduled slot',
    nextAvailableSlot: 'Slots open today & this week',
  };
}

export default function CustomerExplorePage() {
  const [services, setServices] = useState<ExploreService[] | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [errorInfo, setErrorInfo] = useState<{ message: string; correlationId?: string } | null>(
    null
  );

  const load = useCallback(async () => {
    setErrorInfo(null);
    try {
      const res = await fetch('/api/products', { credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErrorInfo({
          message:
            body?.error?.message ||
            'Live catalogue is temporarily unavailable. Showing featured local services.',
          correlationId: body?.error?.correlationId || res.headers.get('x-correlation-id') || undefined,
        });
        setServices(FALLBACK_SERVICES);
        return;
      }
      const data = await res.json();
      const mapped = Array.isArray(data?.products)
        ? data.products.map((item: Record<string, unknown>) => mapProductToService(item))
        : [];
      setServices(mapped.length > 0 ? mapped : FALLBACK_SERVICES);
    } catch {
      setErrorInfo({
        message: 'Could not reach the service catalogue. Showing featured local services.',
      });
      setServices(FALLBACK_SERVICES);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cities = useMemo(() => {
    const set = new Set((services || []).map((s) => s.city || 'Bengaluru'));
    return ['ALL', ...Array.from(set)];
  }, [services]);

  const categories = useMemo(() => {
    const set = new Set((services || []).map((s) => s.category || 'General'));
    return ['ALL', ...Array.from(set)];
  }, [services]);

  const filtered = useMemo(() => {
    if (!services) return [];
    const q = query.trim().toLowerCase();
    const list = services.filter((s) => {
      if (cityFilter !== 'ALL' && s.city !== cityFilter) return false;
      if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.providerName.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    });
    if (sortBy === 'price_asc') return [...list].sort((a, b) => a.pricePaise - b.pricePaise);
    if (sortBy === 'price_desc') return [...list].sort((a, b) => b.pricePaise - a.pricePaise);
    return list;
  }, [services, query, cityFilter, categoryFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Explore Local Services</h1>
          <p className="mt-1 text-xs text-ink-600">
            Compare transparent pricing, inclusions, exclusions, and cancellation policies before
            you book.
          </p>
        </div>

        <div className="flex items-center gap-2" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-4 text-xs font-bold transition ${
              viewMode === 'list'
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-ink-200 bg-white text-ink-800 hover:bg-ink-50'
            }`}
          >
            <List className="h-4 w-4" />
            List View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-4 text-xs font-bold transition ${
              viewMode === 'map'
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-ink-200 bg-white text-ink-800 hover:bg-ink-50'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Map View
          </button>
        </div>
      </div>

      {errorInfo && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
        >
          <p className="font-semibold">{errorInfo.message}</p>
          {errorInfo.correlationId && (
            <p className="mt-1 font-mono text-[11px] text-amber-800">
              Reference ID: {errorInfo.correlationId}
            </p>
          )}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="surface-card grid gap-3 p-4 md:grid-cols-4">
        <label className="relative flex items-center md:col-span-1">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services or providers…"
            aria-label="Search services"
            className="input-field min-h-[44px] w-full pl-9 text-xs"
          />
        </label>

        <select
          aria-label="Filter by city"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="input-field min-h-[44px] text-xs"
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All Cities' : c}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field min-h-[44px] text-xs"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All Categories' : c}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-ink-500" />
          <select
            aria-label="Sort services"
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'featured' | 'price_asc' | 'price_desc')
            }
            className="input-field min-h-[44px] w-full text-xs"
          >
            <option value="featured">Recommended</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Skeleton Loader */}
      {!services ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="surface-card space-y-3 p-5">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-11 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <p className="text-sm font-bold text-ink-900">No services match your filters</p>
          <p className="mt-1 text-xs text-ink-600">
            Try clearing your search query or switching to All Cities.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCityFilter('ALL');
              setCategoryFilter('ALL');
            }}
            className="btn-secondary mt-4 min-h-[44px] text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'map' ? (
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="surface-card relative min-h-[360px] overflow-hidden bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-5 lg:col-span-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-800 shadow-sm">
                <MapPin className="h-3.5 w-3.5 text-brand-600" />
                Interactive Service Map ({filtered.length} providers)
              </span>
              <span className="text-[11px] font-semibold text-ink-500">
                Select a pin to view availability
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {filtered.map((svc, idx) => (
                <Link
                  key={svc.id}
                  href={`/services/${svc.id}`}
                  className="flex min-h-[44px] items-start gap-2.5 rounded-xl border border-brand-200 bg-white/95 p-3 shadow-sm transition hover:border-brand-600 hover:shadow"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink-950">{svc.title}</p>
                    <p className="text-[11px] text-ink-600">
                      {svc.providerName} · {svc.city}
                    </p>
                    <p className="mt-0.5 text-xs font-extrabold text-brand-700">
                      {formatInr(svc.pricePaise)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-3 lg:col-span-2">
            {filtered.map((svc) => (
              <div key={svc.id} className="surface-card space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-ink-950">{svc.title}</h2>
                    <p className="text-[11px] text-ink-600">
                      {svc.providerName} · {svc.city}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-brand-700">
                    {formatInr(svc.pricePaise)}
                  </span>
                </div>
                <p className="text-[11px] text-ink-600">
                  Policy: {svc.cancellationPolicy}
                </p>
                <Link
                  href={`/services/${svc.id}`}
                  className="btn-primary flex min-h-[44px] w-full items-center justify-center text-xs"
                >
                  View Slots &amp; Details
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((svc) => (
            <article key={svc.id} className="surface-card flex flex-col justify-between p-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-ink-500">
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-bold text-brand-800">
                    {svc.category}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {svc.city}
                  </span>
                </div>

                <div>
                  <h2 className="text-base font-extrabold text-ink-950">{svc.title}</h2>
                  <p className="mt-0.5 text-xs font-semibold text-ink-600">{svc.providerName}</p>
                </div>

                <p className="text-xl font-extrabold text-brand-700">
                  {formatInr(svc.pricePaise)}
                </p>

                <div className="space-y-1 text-xs text-ink-700">
                  <p className="font-bold text-ink-900">Key Inclusions:</p>
                  {svc.inclusions.slice(0, 2).map((inc) => (
                    <p key={inc} className="flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{inc}</span>
                    </p>
                  ))}
                </div>

                <div className="rounded-lg bg-ink-50 p-2.5 text-[11px] text-ink-700">
                  <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                    {svc.cancellationPolicy}
                  </p>
                  {svc.nextAvailableSlot && (
                    <p className="mt-1 flex items-center gap-1.5 text-ink-600">
                      <Calendar className="h-3.5 w-3.5" />
                      Next slot: {svc.nextAvailableSlot}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-2">
                <Link
                  href={`/services/${svc.id}`}
                  className="btn-primary flex min-h-[44px] w-full items-center justify-center text-xs"
                >
                  View Availability &amp; Book
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
