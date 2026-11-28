'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

const PROOF_TYPES = ['Visited', 'Researched', 'Gifted', 'Paid'] as const;
type ProofType = (typeof PROOF_TYPES)[number];

interface StudioPost {
  id: string;
  title: string;
  serviceName: string;
  proofType: ProofType;
  caption: string;
  createdAt: string;
}

const DISCLOSURE_BADGE_MAP: Record<ProofType, { label: string; style: string }> = {
  Visited: {
    label: 'Visited In-Person',
    style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  Researched: {
    label: 'Independent Research',
    style: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  Gifted: {
    label: 'Gifted / Hosted Experience',
    style: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  Paid: {
    label: 'Paid Partnership (ASCI)',
    style: 'bg-purple-50 text-purple-800 border-purple-200',
  },
};

export default function CreatorStudioPage() {
  const { notify } = useToast();
  const [title, setTitle] = useState('');
  const [serviceName, setServiceName] = useState(
    'Ayurvedic Deep Tissue & Recovery Session (60 min)'
  );
  const [proofType, setProofType] = useState<ProofType | ''>('');
  const [caption, setCaption] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [posts, setPosts] = useState<StudioPost[]>([
    {
      id: 'post-101',
      title: 'Why Prana Studio Indiranagar is worth every rupee',
      serviceName: 'Ayurvedic Deep Tissue & Recovery Session (60 min)',
      proofType: 'Visited',
      caption: 'Booked a 4 PM slot, scanned my QR pass at reception, zero wait time.',
      createdAt: '2026-11-27',
    },
    {
      id: 'post-102',
      title: 'Coastal Tasting Menu Breakdown',
      serviceName: 'Chef’s 5-Course Coastal Tasting Experience',
      proofType: 'Paid',
      caption: 'Sponsored tasting collaboration — transparent exclusions noted in listing.',
      createdAt: '2026-11-26',
    },
  ]);

  function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!proofType) {
      setValidationError(
        'Mandatory proof_type required: choose Visited, Researched, Gifted, or Paid before publishing.'
      );
      notify('Select a proof_type disclosure badge to publish.', 'error');
      return;
    }

    if (!title.trim() || !caption.trim()) {
      setValidationError('Please enter both a headline and recommendation notes.');
      return;
    }

    setPosts((prev) => [
      {
        id: `post-${Date.now()}`,
        title: title.trim(),
        serviceName,
        proofType,
        caption: caption.trim(),
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    setTitle('');
    setCaption('');
    setProofType('');
    notify('Proof-badged recommendation published!', 'success');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Creator Content Studio &amp; Disclosure Badges
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Every recommendation on VALUEOUS requires a verified{' '}
          <code className="font-mono">proof_type</code> badge (Visited, Researched, Gifted, or
          Paid).
        </p>
      </div>

      <form onSubmit={handlePublish} className="surface-card space-y-4 p-6">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
          <Sparkles className="h-5 w-5 text-creator-700" />
          Publish Proof-Badged Recommendation
        </h2>

        {validationError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-text" htmlFor="studio-title">
              Recommendation Headline
            </label>
            <input
              id="studio-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field min-h-[44px]"
              placeholder="e.g. Honest review after my 60-min recovery session"
            />
          </div>
          <div>
            <label className="label-text" htmlFor="studio-service">
              Tagged Service / Experience
            </label>
            <select
              id="studio-service"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="input-field min-h-[44px]"
            >
              <option>Ayurvedic Deep Tissue & Recovery Session (60 min)</option>
              <option>Chef’s 5-Course Coastal Tasting Experience</option>
              <option>1-on-1 Mobility & Strength Diagnostic</option>
            </select>
          </div>
        </div>

        {/* Mandatory proof_type selector */}
        <div className="space-y-2">
          <span className="label-text block">
            Mandatory Proof Type (<code className="font-mono">proof_type</code>) *
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PROOF_TYPES.map((pt) => {
              const selected = proofType === pt;
              return (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setProofType(pt)}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition ${
                    selected
                      ? 'border-creator-700 bg-creator-700 text-white'
                      : 'border-ink-200 bg-white text-ink-800 hover:border-creator-400'
                  }`}
                >
                  {pt}
                </button>
              );
            })}
          </div>
          {proofType && (
            <p className="inline-flex items-center gap-1.5 text-xs text-ink-700">
              <ShieldCheck className="h-4 w-4 text-creator-700" />
              ASCI Disclosure Preview:{' '}
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${DISCLOSURE_BADGE_MAP[proofType].style}`}
              >
                {DISCLOSURE_BADGE_MAP[proofType].label}
              </span>
            </p>
          )}
        </div>

        <div>
          <label className="label-text" htmlFor="studio-caption">
            First-Hand Proof &amp; Review Notes
          </label>
          <textarea
            id="studio-caption"
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="input-field"
            placeholder="Share verified details: what was included, pricing transparency, and who it fits best."
          />
        </div>

        <button type="submit" className="btn-primary min-h-[44px] text-xs">
          <CheckCircle2 className="h-4 w-4" />
          Publish with Disclosure Badge
        </button>
      </form>

      {/* Published Studio Posts */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-ink-950">
          Your Published Recommendations ({posts.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => {
            const badge = DISCLOSURE_BADGE_MAP[post.proofType];
            return (
              <article key={post.id} className="surface-card space-y-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badge.style}`}
                  >
                    {badge.label}
                  </span>
                  <span className="text-[11px] text-ink-500">{post.createdAt}</span>
                </div>
                <h3 className="text-sm font-extrabold text-ink-950">{post.title}</h3>
                <p className="text-[11px] font-semibold text-brand-700">{post.serviceName}</p>
                <p className="text-xs text-ink-700">{post.caption}</p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
