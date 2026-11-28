'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookmarkPlus,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { CustomerRequestForm } from '@/components/customer/CustomerRequestForm';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr, formatShortDate } from '@/lib/format';

interface CustomerRequest {
  id: string;
  productId?: string;
  categoryHint?: string;
  pitchNote: string;
  interestTags?: string[];
  budgetRupees?: number;
  status: string;
  createdAt: string;
}

interface MatchedResponse {
  id: string;
  providerName: string;
  offerTitle: string;
  pricePaise: number;
  discountLabel: string;
  inclusions: string;
  cancellationPolicy: string;
  serviceId: string;
}

const SAMPLE_MATCHED_RESPONSES: MatchedResponse[] = [
  {
    id: 'resp-1',
    providerName: 'Prana Studio Indiranagar',
    offerTitle: '60-Min Deep Tissue + Herbal Tea Package',
    pricePaise: 219900,
    discountLabel: '12% off with Need-to-Offer match',
    inclusions: '60-min session, herbal oil, QR pass',
    cancellationPolicy: 'Free cancellation up to 24h before slot',
    serviceId: 'svc-wellness-01',
  },
  {
    id: 'resp-2',
    providerName: 'Kinetic Lab Hauz Khas',
    offerTitle: '45-Min Mobility & Recovery Diagnostic',
    pricePaise: 149900,
    discountLabel: 'Complimentary PDF plan included',
    inclusions: '45-min coach assessment, locker access',
    cancellationPolicy: 'Free reschedule up to 6h before slot',
    serviceId: 'svc-fitness-03',
  },
];

export function CustomerRequestsList() {
  const { notify } = useToast();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [savedResponseIds, setSavedResponseIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer/request', { credentials: 'include' });
      const data = await res.json().catch(() => null);
      if (res.ok) setRequests(data.requests || []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSaveMatched(resp: MatchedResponse) {
    setSavedResponseIds((prev) => new Set(prev).add(resp.id));
    notify(`Saved "${resp.offerTitle}" to your Value Passport`, 'success');
  }

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-ink-950">
            <MessageSquare className="h-5 w-5 text-brand-600" />
            Need-to-Offer Requests &amp; Matched Inbox
          </h1>
          <p className="mt-1 text-xs text-ink-600">
            Post what you need, compare transparent offers side-by-side, and save to your Value
            Passport.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="btn-primary min-h-[44px] text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>{showForm ? 'Close Form' : 'New Request'}</span>
        </button>
      </div>

      {showForm ? (
        <div className="surface-card p-5">
          <h2 className="text-sm font-extrabold text-ink-950">Send a request</h2>
          <p className="mt-1 text-xs text-ink-600">
            Describe the service or offer you are looking for.
          </p>
          <div className="mt-4">
            <CustomerRequestForm
              onSubmitted={() => {
                setShowForm(false);
                void load();
              }}
            />
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          <div className="skeleton h-24 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      ) : requests.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-brand-300" />
          <p className="mt-2 text-sm font-bold text-ink-950">No requests yet</p>
          <p className="mt-1 text-xs text-ink-600">
            Start with a request — we will match it to relevant offers.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <li key={req.id} className="surface-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-ink-950">
                    {req.categoryHint || 'Service / Product request'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-500">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {formatShortDate(req.createdAt)}
                    {req.budgetRupees ? ` · Budget ₹${req.budgetRupees}` : ''}
                  </p>
                </div>
                <span className="rounded-full bg-surface-customer px-2.5 py-1 text-[10px] font-extrabold text-brand-800">
                  {req.status}
                </span>
              </div>
              <p className="mt-2 text-xs text-ink-700">{req.pitchNote}</p>
              {req.interestTags && req.interestTags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {req.interestTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* Side-by-Side Offer Comparison Inbox */}
      <section className="surface-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
            <Scale className="h-5 w-5 text-brand-600" />
            Compare Matched Responses
          </h2>
          <span className="text-xs font-semibold text-ink-500">
            Side-by-side transparent pricing &amp; policy comparison
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {SAMPLE_MATCHED_RESPONSES.map((resp) => {
            const isSaved = savedResponseIds.has(resp.id);
            return (
              <div
                key={resp.id}
                className="flex flex-col justify-between space-y-3 rounded-xl border border-ink-200 p-4 text-xs"
              >
                <div className="space-y-1.5">
                  <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    {resp.discountLabel}
                  </span>
                  <h3 className="text-sm font-extrabold text-ink-950">{resp.offerTitle}</h3>
                  <p className="font-semibold text-ink-600">{resp.providerName}</p>
                  <p className="text-lg font-black text-brand-700">
                    {formatInr(resp.pricePaise)}
                  </p>
                  <p className="text-ink-700">
                    <strong>Inclusions:</strong> {resp.inclusions}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-ink-600">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
                    {resp.cancellationPolicy}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isSaved}
                    onClick={() => handleSaveMatched(resp)}
                    className="btn-secondary min-h-[44px] flex-1 text-xs"
                  >
                    {isSaved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Saved
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="h-4 w-4" />
                        Save to Passport
                      </>
                    )}
                  </button>
                  <Link
                    href={`/services/${resp.serviceId}`}
                    className="btn-primary min-h-[44px] inline-flex flex-1 items-center justify-center text-xs"
                  >
                    View &amp; Book
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
