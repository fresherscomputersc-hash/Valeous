'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, Copy, Link2, Sparkles, Ticket } from 'lucide-react';
import { formatInr } from '@/lib/format';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface EnrollmentSnapshot {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED';
  promoCode: string | null;
  rejectionReason: string | null;
  clicksCount?: number;
  totalSalesCount: number;
  totalCommissionPaise: number;
}

export function EnrollProductWidget({
  productId,
  businessId,
  productTitle,
  brandName,
  buyerDiscountPercent,
  productStatus,
  actorRole: initialActorRole,
  ownsThisProduct: initialOwns,
  existingEnrollment: initialEnrollment,
}: {
  productId: string;
  businessId: string;
  productTitle: string;
  brandName: string;
  buyerDiscountPercent: number;
  productStatus: 'ACTIVE' | 'PAUSED' | 'ENDED';
  actorRole: 'INFLUENCER' | 'BUSINESS' | 'ADMIN' | 'CUSTOMER' | null;
  ownsThisProduct: boolean;
  existingEnrollment: EnrollmentSnapshot | null;
}) {
  const { actor } = useAuth();
  const [enrollment, setEnrollment] = useState<EnrollmentSnapshot | null>(
    initialEnrollment
  );
  const [pitchNote, setPitchNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedWhich, setCopiedWhich] = useState<'code' | 'link' | 'caption' | null>(
    null
  );
  const { notify } = useToast();

  const resolvedRole = actor?.user.role ?? initialActorRole;
  const resolvedOwns =
    Boolean(actor?.businessProfile && actor.businessProfile.id === businessId) ||
    initialOwns;

  const fetchLatestEnrollment = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/influencer/enrollments?productId=${encodeURIComponent(productId)}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.enrollment) setEnrollment(data.enrollment);
      }
    } catch {
      // ignore
    }
  }, [productId]);

  useEffect(() => {
    if (resolvedRole === 'INFLUENCER' && !initialEnrollment) {
      void fetchLatestEnrollment();
    }
  }, [resolvedRole, initialEnrollment, fetchLatestEnrollment]);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/influencer/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId, pitchNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data?.error?.message || 'Could not submit enrollment', 'error');
        return;
      }
      setEnrollment({
        id: data.enrollment.id,
        status: data.enrollment.status,
        promoCode: data.enrollment.promoCode,
        rejectionReason: null,
        totalSalesCount: 0,
        totalCommissionPaise: 0,
      });
      notify(
        'Enrollment submitted! Once the business approves, your unique promo code will appear here.',
        'success'
      );
    } catch {
      notify('Network error submitting enrollment', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function copyText(text: string, which: 'code' | 'link' | 'caption') {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedWhich(which);
    setTimeout(() => setCopiedWhich(null), 2000);
    notify(
      which === 'code'
        ? 'Promo code copied!'
        : which === 'link'
          ? 'Tracked short-link copied!'
          : 'ASCI-compliant caption copied!',
      'success'
    );
  }

  if (resolvedOwns) {
    return (
      <div className="surface-card space-y-3 border-sky-200 bg-sky-50/50 p-6">
        <p className="text-sm font-extrabold text-ink-950">You own this product listing</p>
        <p className="text-xs text-ink-600">
          Review creator enrollment applications or log promo-code sales from your Business Hub.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/business/enrollments" className="btn-primary py-2 text-xs">
            Review Creator Requests
          </Link>
          <Link href="/business/sales" className="btn-secondary py-2 text-xs">
            Log Promo Sale
          </Link>
        </div>
      </div>
    );
  }

  if (!resolvedRole) {
    return (
      <div className="surface-card space-y-3 p-6">
        <h2 className="text-lg font-extrabold text-ink-950">
          Want to promote this product &amp; earn?
        </h2>
        <p className="text-xs leading-relaxed text-ink-600">
          Sign in with a Creator account to enroll, get your personal promo code + tracked `/r/CODE` link, and earn commission on every sale.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href="/login" className="btn-primary py-2.5 text-xs">
            Sign in to Enroll
          </Link>
          <Link
            href="/register?role=INFLUENCER"
            className="btn-secondary py-2.5 text-xs"
          >
            Create Creator Account
          </Link>
        </div>
      </div>
    );
  }

  if (resolvedRole !== 'INFLUENCER') {
    return (
      <div className="surface-card p-6 text-xs text-ink-600">
        Signed in as <strong>{resolvedRole}</strong>. Switch to a Creator account to enroll in product campaigns and receive promo codes.
      </div>
    );
  }

  if (enrollment?.status === 'APPROVED' && enrollment.promoCode) {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const trackedLink = `${origin}/r/${enrollment.promoCode}`;
    const caption = `Loving ${productTitle} from ${brandName}! Use my promo code ${enrollment.promoCode}${
      buyerDiscountPercent > 0 ? ` for ${buyerDiscountPercent}% OFF` : ''
    } 👉 ${trackedLink} #ad #collab`;

    return (
      <div
        data-testid="active-promo-code-card"
        className="space-y-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/70 p-6"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-emerald-800 uppercase">
            <Ticket className="h-4 w-4" />
            <span>Your Active Promo Code</span>
          </div>
          <StatusBadge status="APPROVED" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
          <code
            data-testid="influencer-promo-code"
            className="font-mono text-2xl font-black tracking-wider text-ink-950"
          >
            {enrollment.promoCode}
          </code>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copyText(enrollment.promoCode!, 'code')}
              className="btn-primary py-2 text-xs"
            >
              {copiedWhich === 'code' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>{copiedWhich === 'code' ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <button
              type="button"
              onClick={() => copyText(trackedLink, 'link')}
              className="btn-secondary py-2 text-xs"
            >
              <Link2 className="h-4 w-4" />
              <span>{copiedWhich === 'link' ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-white/80 p-3 text-xs text-ink-700">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-ink-900">
              Ready-to-post caption (#ad):
            </span>
            <button
              type="button"
              onClick={() => copyText(caption, 'caption')}
              className="font-bold text-brand-700 hover:underline"
            >
              {copiedWhich === 'caption' ? 'Copied!' : 'Copy caption'}
            </button>
          </div>
          <p className="mt-1 italic text-ink-600">&ldquo;{caption}&rdquo;</p>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
          <div className="rounded-xl border border-emerald-100 bg-white p-2.5">
            <p className="text-ink-500">Clicks</p>
            <p className="mt-0.5 text-base font-extrabold text-ink-950">
              {enrollment.clicksCount ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-2.5">
            <p className="text-ink-500">Orders</p>
            <p className="mt-0.5 text-base font-extrabold text-ink-950">
              {enrollment.totalSalesCount}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-2.5">
            <p className="text-ink-500">Earned</p>
            <p className="mt-0.5 text-base font-extrabold text-emerald-700">
              {formatInr(enrollment.totalCommissionPaise)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (enrollment?.status === 'PENDING') {
    return (
      <div
        data-testid="pending-enrollment-card"
        className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-6"
      >
        <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 uppercase">
          <Clock className="h-4 w-4" />
          <span>Enrollment Pending Business Approval</span>
        </div>
        <p className="text-xs leading-relaxed text-amber-950">
          Your request to promote <strong>{productTitle}</strong> has been sent to{' '}
          <strong>{brandName}</strong>. As soon as they approve you, your unique promo code will appear here and in{' '}
          <Link href="/influencer/campaigns" className="font-bold underline">
            My Promo Codes
          </Link>
          .
        </p>
      </div>
    );
  }

  if (productStatus !== 'ACTIVE') {
    return (
      <div className="surface-card p-6 text-xs text-ink-600">
        This product campaign is currently <strong>{productStatus}</strong> and not accepting new enrollments.
      </div>
    );
  }

  return (
    <form onSubmit={handleEnroll} className="surface-card space-y-4 p-6">
      <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-brand-700 uppercase">
        <Sparkles className="h-4 w-4" />
        <span>Enroll to Promote &amp; Get Your Promo Code</span>
      </div>

      {enrollment?.status === 'REJECTED' ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
          <strong>Previous application note:</strong>{' '}
          {enrollment.rejectionReason || 'Not selected'}. You may update your pitch and re-apply below.
        </div>
      ) : null}

      <div>
        <label htmlFor="pitch-note" className="label-text">
          How will you promote this product on social media?
        </label>
        <textarea
          id="pitch-note"
          rows={3}
          required
          minLength={5}
          maxLength={600}
          value={pitchNote}
          onChange={(e) => setPitchNote(e.target.value)}
          placeholder="e.g., Planning an Instagram Reel + YouTube Short showing unboxing & daily usage with my audience…"
          className="input-field"
        />
      </div>

      <button
        type="submit"
        data-testid="enroll-submit-btn"
        disabled={submitting}
        className="btn-primary w-full justify-center py-3 text-sm"
      >
        {submitting ? 'Submitting Request…' : 'Enroll & Request Unique Promo Code'}
      </button>
    </form>
  );
}
