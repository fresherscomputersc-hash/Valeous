'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr, rupeesToPaise } from '@/lib/format';

export interface ProductFormInitial {
  id: string;
  title: string;
  categoryId: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string | null;
  externalProductUrl: string | null;
  retailPricePaise: number;
  commissionType: 'FIXED_PER_SALE' | 'PERCENTAGE';
  commissionFixedPaise: number | null;
  commissionPercent: number | null;
  buyerDiscountPercent: number;
  promoCodePrefix: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
}

export function ProductCampaignForm({
  categories,
  initial,
}: {
  categories: Array<{ id: string; name: string }>;
  initial?: ProductFormInitial;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? ''
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt ?? '');
  const [externalProductUrl, setExternalProductUrl] = useState(
    initial?.externalProductUrl ?? ''
  );
  const [retailPriceRupees, setRetailPriceRupees] = useState(
    initial ? String(initial.retailPricePaise / 100) : '999'
  );
  const [commissionType, setCommissionType] = useState<'FIXED_PER_SALE' | 'PERCENTAGE'>(
    initial?.commissionType ?? 'PERCENTAGE'
  );
  const [commissionFixedRupees, setCommissionFixedRupees] = useState(
    initial?.commissionFixedPaise ? String(initial.commissionFixedPaise / 100) : '150'
  );
  const [commissionPercent, setCommissionPercent] = useState(
    initial?.commissionPercent ? String(initial.commissionPercent) : '15'
  );
  const [buyerDiscountPercent, setBuyerDiscountPercent] = useState(
    String(initial?.buyerDiscountPercent ?? 10)
  );
  const [promoCodePrefix, setPromoCodePrefix] = useState(
    initial?.promoCodePrefix ?? ''
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const { notify } = useToast();

  // Live preview math
  const priceNum = Math.max(0, Number(retailPriceRupees) || 0);
  const discountNum = Math.min(80, Math.max(0, Number(buyerDiscountPercent) || 0));
  const netBuyerPaise = Math.round(rupeesToPaise(priceNum) * ((100 - discountNum) / 100));
  const previewCommissionPaise =
    commissionType === 'FIXED_PER_SALE'
      ? rupeesToPaise(Math.max(0, Number(commissionFixedRupees) || 0))
      : Math.round((netBuyerPaise * Math.max(0, Number(commissionPercent) || 0)) / 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        title,
        categoryId,
        description,
        imageUrl,
        imageAlt,
        externalProductUrl,
        retailPriceRupees: Number(retailPriceRupees),
        commissionType,
        commissionFixedRupees:
          commissionType === 'FIXED_PER_SALE' ? Number(commissionFixedRupees) : undefined,
        commissionPercent:
          commissionType === 'PERCENTAGE' ? Number(commissionPercent) : undefined,
        buyerDiscountPercent: Number(buyerDiscountPercent || 0),
        promoCodePrefix: promoCodePrefix.trim().toUpperCase(),
      };

      const url = initial ? `/api/products/${initial.id}` : '/api/products';
      const method = initial ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || 'Could not save product');
        return;
      }

      notify(
        initial
          ? 'Product campaign updated!'
          : 'Product listed! Influencers can now enroll to promote it.',
        'success'
      );
      router.push('/business/products');
      router.refresh();
    } catch {
      setError('Network error saving product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card space-y-6 p-6 sm:p-8">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-900"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="prod-title" className="label-text">
            Product Name
          </label>
          <input
            id="prod-title"
            type="text"
            required
            minLength={3}
            maxLength={140}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Cold Brew Concentrate Pack (3 Bottles)"
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="prod-cat" className="label-text">
            Category
          </label>
          <select
            id="prod-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input-field"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="prod-price" className="label-text">
            Product Retail Price (₹ INR)
          </label>
          <input
            id="prod-price"
            type="number"
            step="0.01"
            min="1"
            required
            value={retailPriceRupees}
            onChange={(e) => setRetailPriceRupees(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="prod-discount" className="label-text">
            Buyer Discount with Code (%)
          </label>
          <input
            id="prod-discount"
            type="number"
            min="0"
            max="80"
            value={buyerDiscountPercent}
            onChange={(e) => setBuyerDiscountPercent(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label htmlFor="prod-prefix" className="label-text">
            Promo Code Prefix (optional)
          </label>
          <input
            id="prod-prefix"
            type="text"
            maxLength={10}
            value={promoCodePrefix}
            onChange={(e) =>
              setPromoCodePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
            }
            placeholder="e.g. GLOW or BREW"
            className="input-field font-mono uppercase"
          />
        </div>
      </div>

      {/* Commission Structure */}
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
        <p className="text-sm font-extrabold text-ink-950">
          How much will you pay Influencers per sale?
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setCommissionType('PERCENTAGE')}
            className={`rounded-xl border-2 p-3.5 text-left ${
              commissionType === 'PERCENTAGE'
                ? 'border-emerald-600 bg-white'
                : 'border-ink-200 bg-white/60'
            }`}
          >
            <p className="text-xs font-extrabold text-ink-950">
              Percentage (%) Commission
            </p>
            <p className="mt-0.5 text-[11px] text-ink-600">
              Influencer earns a % of the order value on every code use.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setCommissionType('FIXED_PER_SALE')}
            className={`rounded-xl border-2 p-3.5 text-left ${
              commissionType === 'FIXED_PER_SALE'
                ? 'border-emerald-600 bg-white'
                : 'border-ink-200 bg-white/60'
            }`}
          >
            <p className="text-xs font-extrabold text-ink-950">
              Fixed ₹ Amount Per Unit Sold
            </p>
            <p className="mt-0.5 text-[11px] text-ink-600">
              Influencer earns a flat rupee payout per item bought with their code.
            </p>
          </button>
        </div>

        {commissionType === 'PERCENTAGE' ? (
          <div>
            <label htmlFor="comm-pct" className="label-text">
              Influencer Commission Percentage (1% – 90%)
            </label>
            <input
              id="comm-pct"
              type="number"
              min="1"
              max="90"
              required
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="input-field max-w-xs bg-white"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="comm-fixed" className="label-text">
              Fixed Influencer Payout Per Unit Sold (₹ INR)
            </label>
            <input
              id="comm-fixed"
              type="number"
              step="0.01"
              min="1"
              required
              value={commissionFixedRupees}
              onChange={(e) => setCommissionFixedRupees(e.target.value)}
              className="input-field max-w-xs bg-white"
            />
          </div>
        )}

        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs text-ink-800">
          <strong>Live Unit Economics Preview:</strong> Buyer pays{' '}
          <strong>{formatInr(netBuyerPaise)}</strong> ({discountNum}% off{' '}
          {formatInr(rupeesToPaise(priceNum))}) → Influencer earns{' '}
          <strong className="text-emerald-700">{formatInr(previewCommissionPaise)}</strong>{' '}
          → Your net before COGS:{' '}
          <strong>{formatInr(Math.max(0, netBuyerPaise - previewCommissionPaise))}</strong>.
        </div>
      </div>

      <div>
        <label htmlFor="prod-url" className="label-text">
          Where Buyers Purchase This Product (Website URL, optional)
        </label>
        <input
          id="prod-url"
          type="url"
          value={externalProductUrl}
          onChange={(e) => setExternalProductUrl(e.target.value)}
          placeholder="https://yourstore.com/products/item"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="prod-desc" className="label-text">
          Product Details &amp; Talking Points for Influencers
        </label>
        <textarea
          id="prod-desc"
          rows={4}
          required
          minLength={15}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe key product benefits, target audience, and any social media guidelines…"
          className="input-field"
        />
      </div>

      <ImageUploader
        value={imageUrl}
        altValue={imageAlt}
        onChange={setImageUrl}
        onAltChange={setImageAlt}
        label="Product Photo"
      />

      <div className="flex justify-end gap-3 border-t border-ink-100 pt-4">
        <button type="submit" disabled={saving} className="btn-primary px-6 py-3">
          {saving
            ? 'Saving…'
            : initial
              ? 'Save Product Changes'
              : 'Publish Product Campaign'}
        </button>
      </div>
    </form>
  );
}
