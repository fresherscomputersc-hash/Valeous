'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import type { CustomerOffer } from '@/components/customer/OfferMatchCard';

export function CustomerRequestForm({
  offer,
  onSubmitted,
}: {
  offer?: CustomerOffer | null;
  onSubmitted?: () => void;
}) {
  const { notify } = useToast();
  const [pitchNote, setPitchNote] = useState('');
  const [budgetRupees, setBudgetRupees] = useState('');
  const [interestTags, setInterestTags] = useState('');
  const [categoryHint, setCategoryHint] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tags = interestTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8);

      const res = await fetch('/api/customer/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: offer?.id,
          categoryHint: categoryHint.trim() || undefined,
          pitchNote: pitchNote.trim(),
          interestTags: tags.length > 0 ? tags : undefined,
          budgetRupees: budgetRupees ? Number(budgetRupees) : 0,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        notify(data?.error?.message || 'Could not submit request', 'error');
        return;
      }
      notify('Request sent — businesses and creators can now respond', 'success');
      setPitchNote('');
      setBudgetRupees('');
      setInterestTags('');
      setCategoryHint('');
      onSubmitted?.();
    } catch {
      notify('Network error while submitting request', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {offer ? (
        <div className="rounded-xl border border-brand-200 bg-surface-customer px-3 py-2 text-xs">
          <p className="font-bold text-ink-950">{offer.title}</p>
          <p className="text-ink-600">
            {offer.brandName} · {offer.categoryName}
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="cr-category" className="label-text">
            What are you looking for? (optional)
          </label>
          <input
            id="cr-category"
            type="text"
            maxLength={80}
            value={categoryHint}
            onChange={(e) => setCategoryHint(e.target.value)}
            placeholder="e.g. Skincare, Cafés, Fitness gear"
            className="input-field"
          />
        </div>
      )}

      <div>
        <label htmlFor="cr-note" className="label-text">
          Your note
        </label>
        <textarea
          id="cr-note"
          required
          minLength={5}
          maxLength={600}
          rows={4}
          value={pitchNote}
          onChange={(e) => setPitchNote(e.target.value)}
          placeholder="Tell businesses and creators what you want and why."
          className="input-field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cr-budget" className="label-text">
            Budget (₹, optional)
          </label>
          <input
            id="cr-budget"
            type="number"
            min={0}
            max={10_000_000}
            value={budgetRupees}
            onChange={(e) => setBudgetRupees(e.target.value)}
            placeholder="1500"
            className="input-field"
          />
        </div>
        <div>
          <label htmlFor="cr-tags" className="label-text">
            Interest tags (comma separated)
          </label>
          <input
            id="cr-tags"
            type="text"
            value={interestTags}
            onChange={(e) => setInterestTags(e.target.value)}
            placeholder="vegan, local, gifting"
            className="input-field"
          />
        </div>
      </div>

      <button type="submit" disabled={submitting} className="btn-primary text-xs">
        <Send className="h-4 w-4" />
        <span>{submitting ? 'Sending…' : 'Send Request'}</span>
      </button>
    </form>
  );
}
