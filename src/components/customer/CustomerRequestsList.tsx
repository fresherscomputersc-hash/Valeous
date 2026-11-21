'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Clock, MessageSquare, Plus } from 'lucide-react';
import { CustomerRequestForm } from '@/components/customer/CustomerRequestForm';
import { formatShortDate } from '@/lib/format';

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

export function CustomerRequestsList() {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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

  return (
    <div className="space-y-5">
      <div className="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-950">
            <MessageSquare className="h-5 w-5 text-brand-600" />
            My Requests
          </h2>
          <p className="mt-1 text-xs text-ink-600">
            Tell businesses and creators exactly what you need. Your requests stay open
            until an offer is matched.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="btn-primary text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>{showForm ? 'Close Form' : 'New Request'}</span>
        </button>
      </div>

      {showForm ? (
        <div className="surface-card p-5">
          <h3 className="text-sm font-extrabold text-ink-950">Send a request</h3>
          <p className="mt-1 text-xs text-ink-600">
            Describe the product or offer you are looking for.
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
        <div className="py-8 text-center text-xs text-ink-500">Loading requests…</div>
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
                    {req.categoryHint || 'Product request'}
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
    </div>
  );
}
