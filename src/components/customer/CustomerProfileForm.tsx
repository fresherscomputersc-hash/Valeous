'use client';

import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface CustomerProfile {
  id: string;
  displayName: string;
  city: string;
  preferences: string | null;
}

function parseInterests(preferences: string | null): string {
  if (!preferences) return '';
  try {
    const parsed = JSON.parse(preferences) as { interests?: unknown };
    if (Array.isArray(parsed.interests)) {
      return parsed.interests.filter((i) => typeof i === 'string').join(', ');
    }
    return '';
  } catch {
    return '';
  }
}

export function CustomerProfileForm({
  profile,
  onSaved,
}: {
  profile: CustomerProfile;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [city, setCity] = useState(profile.city);
  const [interests, setInterests] = useState(parseInterests(profile.preferences));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setCity(profile.city);
    setInterests(parseInterests(profile.preferences));
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const interestList = interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          displayName: displayName.trim(),
          city: city.trim(),
          preferences: JSON.stringify({ interests: interestList }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not save profile', 'error');
        return;
      }
      notify('Profile saved', 'success');
      onSaved();
    } catch {
      notify('Network error while saving profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cp-name" className="label-text">
          Your name
        </label>
        <input
          id="cp-name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="cp-city" className="label-text">
          City
        </label>
        <input
          id="cp-city"
          type="text"
          required
          minLength={2}
          maxLength={60}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Bhubaneswar"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="cp-interests" className="label-text">
          Interests (comma separated)
        </label>
        <input
          id="cp-interests"
          type="text"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="Skincare, Cafés, Fitness"
          className="input-field"
        />
        <p className="mt-1 text-[11px] text-ink-500">
          Used to personalise recommendations for you.
        </p>
      </div>

      <button type="submit" disabled={saving} className="btn-primary text-xs">
        <Save className="h-4 w-4" />
        <span>{saving ? 'Saving…' : 'Save Profile'}</span>
      </button>
    </form>
  );
}
