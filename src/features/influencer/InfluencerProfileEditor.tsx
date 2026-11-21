'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';

export function InfluencerProfileEditor({
  profile,
}: {
  profile: {
    handle: string;
    displayName: string;
    bio: string;
    niche: string;
    instagramUrl: string | null;
    youtubeUrl: string | null;
    followerCount: number;
    upiId: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    panNumber?: string | null;
    bankDetailsNote: string | null;
  };
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [niche, setNiche] = useState(profile.niche);
  const [instagramUrl, setInstagramUrl] = useState(profile.instagramUrl || '');
  const [youtubeUrl, setYoutubeUrl] = useState(profile.youtubeUrl || '');
  const [followerCount, setFollowerCount] = useState(String(profile.followerCount));
  const [upiId, setUpiId] = useState(profile.upiId || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(
    profile.bankAccountNumber || ''
  );
  const [bankIfsc, setBankIfsc] = useState(profile.bankIfsc || '');
  const [panNumber, setPanNumber] = useState(profile.panNumber || '');
  const [bankDetailsNote, setBankDetailsNote] = useState(profile.bankDetailsNote || '');
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const { refreshActor } = useAuth();
  const { notify } = useToast();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/influencer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName,
          bio,
          niche,
          instagramUrl,
          youtubeUrl,
          followerCount: Number(followerCount) || 0,
          upiId: upiId.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankIfsc: bankIfsc.trim().toUpperCase(),
          panNumber: panNumber.trim().toUpperCase(),
          bankDetailsNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not update profile', 'error');
        return;
      }
      notify('Creator profile, KYC & payout details saved!', 'success');
      await refreshActor();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="surface-card space-y-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-2.5 text-xs">
        <span className="font-semibold text-ink-800">
          Public Creator Portfolio: <code className="font-mono">/creators/{profile.handle}</code>
        </span>
        <Link
          href={`/creators/${profile.handle}`}
          className="inline-flex items-center gap-1 font-bold text-brand-700 hover:underline"
        >
          <span>Preview Public Profile</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label-text">Public Handle</label>
          <input
            type="text"
            disabled
            value={`@${profile.handle}`}
            className="input-field bg-ink-100 text-ink-500"
          />
        </div>

        <div>
          <label htmlFor="inf-name" className="label-text">
            Display Name
          </label>
          <input
            id="inf-name"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="inf-niche" className="label-text">
            Primary Niche
          </label>
          <input
            id="inf-niche"
            type="text"
            required
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="inf-followers" className="label-text">
            Total Audience / Followers
          </label>
          <input
            id="inf-followers"
            type="number"
            min="0"
            value={followerCount}
            onChange={(e) => setFollowerCount(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="inf-ig" className="label-text">
            Instagram Profile URL
          </label>
          <input
            id="inf-ig"
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="inf-yt" className="label-text">
            YouTube Channel URL
          </label>
          <input
            id="inf-yt"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/@yourchannel"
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="inf-bio" className="label-text">
          Creator Bio &amp; Audience Summary
        </label>
        <textarea
          id="inf-bio"
          rows={3}
          required
          minLength={10}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="input-field"
        />
      </div>

      {/* Payout & Tax KYC */}
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <div>
          <h2 className="text-sm font-extrabold text-ink-950">
            Verified UPI / Bank IMPS &amp; Tax KYC
          </h2>
          <p className="text-xs text-ink-600">
            Validated strictly before withdrawals so payouts never bounce.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="inf-upi" className="label-text">
              UPI ID (VPA, e.g. name@okicici)
            </label>
            <input
              id="inf-upi"
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@okaxis"
              className="input-field font-mono text-xs"
            />
          </div>

          <div>
            <label htmlFor="inf-pan" className="label-text">
              PAN Number (for TDS receipts, e.g. ABCDE1234F)
            </label>
            <input
              id="inf-pan"
              type="text"
              maxLength={10}
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              className="input-field font-mono text-xs uppercase"
            />
          </div>

          <div>
            <label htmlFor="inf-acc" className="label-text">
              Bank Account Number (optional fallback)
            </label>
            <input
              id="inf-acc"
              type="text"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="501004829102"
              className="input-field font-mono text-xs"
            />
          </div>

          <div>
            <label htmlFor="inf-ifsc" className="label-text">
              Bank IFSC Code (11 chars, e.g. HDFC0001204)
            </label>
            <input
              id="inf-ifsc"
              type="text"
              maxLength={11}
              value={bankIfsc}
              onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
              placeholder="HDFC0001204"
              className="input-field font-mono text-xs uppercase"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="inf-bank-note" className="label-text">
              Beneficiary Name / Bank Branch Note (optional)
            </label>
            <input
              id="inf-bank-note"
              type="text"
              value={bankDetailsNote}
              onChange={(e) => setBankDetailsNote(e.target.value)}
              placeholder="Account holder name as per bank passbook"
              className="input-field text-xs"
            />
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Saving…' : 'Save Creator Profile & Payout Settings'}
      </button>
    </form>
  );
}
