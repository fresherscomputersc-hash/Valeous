'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';

export function BusinessProfileEditor({
  profile,
  categories,
}: {
  profile: {
    brandName: string;
    slug: string;
    categoryId: string | null;
    description: string;
    websiteUrl: string | null;
    city: string;
    gstin?: string | null;
  };
  categories: Array<{ id: string; name: string }>;
}) {
  const [brandName, setBrandName] = useState(profile.brandName);
  const [categoryId, setCategoryId] = useState(profile.categoryId || '');
  const [description, setDescription] = useState(profile.description);
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl || '');
  const [city, setCity] = useState(profile.city);
  const [gstin, setGstin] = useState(profile.gstin || '');
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const { refreshActor } = useAuth();
  const { notify } = useToast();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/business/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brandName,
          categoryId: categoryId || null,
          description,
          websiteUrl,
          city,
          gstin: gstin.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Failed to update brand profile', 'error');
        return;
      }
      notify('Brand profile & GSTIN updated!', 'success');
      await refreshActor();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="surface-card space-y-5 p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="b-name" className="label-text">
            Brand Name
          </label>
          <input
            id="b-name"
            type="text"
            required
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="b-cat" className="label-text">
            Primary Category
          </label>
          <select
            id="b-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input-field"
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="b-city" className="label-text">
            City
          </label>
          <input
            id="b-city"
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="b-gstin" className="label-text">
            Business GSTIN (optional, for tax invoices)
          </label>
          <input
            id="b-gstin"
            type="text"
            maxLength={15}
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
            placeholder="21AAACV1234F1Z5"
            className="input-field font-mono uppercase"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="b-web" className="label-text">
            Store Website URL
          </label>
          <input
            id="b-web"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourstore.com"
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label htmlFor="b-desc" className="label-text">
          About Your Brand &amp; Creator Guidelines
        </label>
        <textarea
          id="b-desc"
          rows={4}
          required
          minLength={10}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input-field"
        />
      </div>

      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Saving…' : 'Save Brand Profile'}
      </button>
    </form>
  );
}
