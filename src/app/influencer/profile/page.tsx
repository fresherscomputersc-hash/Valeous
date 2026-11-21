'use client';

import React, { useEffect, useState } from 'react';
import { InfluencerProfileEditor } from '@/features/influencer/InfluencerProfileEditor';

export default function InfluencerProfilePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch('/api/influencer/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setProfile(d.profile);
      })
      .catch(() => {});
  }, []);

  if (!profile) {
    return (
      <div className="py-12 text-center text-xs text-ink-500">
        Loading creator profile…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">
          Creator Profile, UPI / Bank &amp; Tax KYC
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          Keep your social links, audience size, and payout destination accurate for fast brand approvals and withdrawals.
        </p>
      </div>

      <InfluencerProfileEditor profile={profile} />
    </div>
  );
}
