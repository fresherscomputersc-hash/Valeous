'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr } from '@/lib/format';

const VALID_BOOKING_STATES = [
  'Draft',
  'Held',
  'Pending Payment',
  'Pending Approval',
  'Confirmed',
  'Checked In',
  'Completed',
  'Closed',
  'Cancelled',
  'Refund Pending',
  'Refunded',
  'Disputed',
] as const;

type BookingState = (typeof VALID_BOOKING_STATES)[number];

const STATE_MESSAGES: Record<BookingState, { title: string; detail: string }> = {
  Draft: {
    title: 'Draft Booking',
    detail: 'Complete slot selection and proceed to checkout to hold your spot.',
  },
  Held: {
    title: 'Slot Held (5-Minute Window)',
    detail: 'Your slot is temporarily held. Complete payment before the hold expires.',
  },
  'Pending Payment': {
    title: 'Awaiting Payment Webhook Confirmation',
    detail: 'Payment was submitted and is awaiting HMAC-verified webhook confirmation.',
  },
  'Pending Approval': {
    title: 'Awaiting Business Approval',
    detail: 'The provider is reviewing your booking request. You will be notified once confirmed.',
  },
  Confirmed: {
    title: 'Booking Confirmed — Present QR Pass at Venue',
    detail: 'Show this high-contrast single-use QR pass to the provider staff on arrival.',
  },
  'Checked In': {
    title: 'Checked In — QR Pass Redeemed',
    detail: 'Your single-use QR pass was scanned at check-in. Duplicate scans are rejected.',
  },
  Completed: {
    title: 'Service Completed',
    detail: 'Thank you for booking with VALUEOUS. Your digital receipt is recorded.',
  },
  Closed: {
    title: 'Booking Closed & Settled',
    detail: 'This booking lifecycle is complete and settled in the ledger.',
  },
  Cancelled: {
    title: 'Booking Cancelled',
    detail: 'This booking has been cancelled according to the provider cancellation policy.',
  },
  'Refund Pending': {
    title: 'Refund Pending',
    detail: 'Your refund request is queued and will settle to your original payment method.',
  },
  Refunded: {
    title: 'Refund Processed',
    detail: 'Your refund has been reversed and credited back to your payment source.',
  },
  Disputed: {
    title: 'Payment / Service Disputed',
    detail: 'A dispute is open. Payouts are held until resolved by VALUEOUS Support.',
  },
};

function BookingDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { notify } = useToast();

  const bookingId = params?.id || 'bkg-confirmed-001';
  const initialStateParam = searchParams.get('state');
  const initialState: BookingState = VALID_BOOKING_STATES.includes(
    initialStateParam as BookingState
  )
    ? (initialStateParam as BookingState)
    : 'Confirmed';

  const [bookingState, setBookingState] = useState<BookingState>(initialState);
  const [refundReason, setRefundReason] = useState('Schedule conflict');
  const [showRefundForm, setShowRefundForm] = useState(false);

  const amountPaise = 249900;
  const qrToken = `VLS-QR-${bookingId.toUpperCase()}-SINGLEUSE`;
  const info = STATE_MESSAGES[bookingState];

  const canShowQr = bookingState === 'Confirmed' || bookingState === 'Checked In';
  const canRequestRefund =
    bookingState === 'Confirmed' ||
    bookingState === 'Pending Approval' ||
    bookingState === 'Held';

  function handleRequestRefund(e: React.FormEvent) {
    e.preventDefault();
    setBookingState('Refund Pending');
    setShowRefundForm(false);
    notify(`Refund requested (${refundReason}). Status updated to Refund Pending.`, 'info');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/customer/bookings"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Bookings
      </Link>

      {/* Main Booking Status Card */}
      <div className="surface-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] text-ink-500">Booking ID: {bookingId}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-ink-950">{info.title}</h1>
          </div>
          <StatusBadge status={bookingState.toUpperCase().replace(/\s+/g, '_')} />
        </div>

        <p className="text-xs text-ink-700">{info.detail}</p>

        <div className="grid gap-3 rounded-xl bg-ink-50 p-4 text-xs sm:grid-cols-3">
          <div>
            <p className="font-semibold text-ink-500">Service</p>
            <p className="font-bold text-ink-950">Ayurvedic Deep Tissue Session</p>
          </div>
          <div>
            <p className="font-semibold text-ink-500">Provider</p>
            <p className="font-bold text-ink-950">Prana Studio Indiranagar</p>
          </div>
          <div>
            <p className="font-semibold text-ink-500">Amount</p>
            <p className="font-extrabold text-brand-700">{formatInr(amountPaise)}</p>
          </div>
        </div>

        {bookingState === 'Pending Payment' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <span className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4" />
              Waiting for signed payment webhook confirmation…
            </span>
            <button
              type="button"
              onClick={() => setBookingState('Confirmed')}
              className="btn-secondary min-h-[44px] text-xs"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </button>
          </div>
        )}

        {bookingState === 'Disputed' && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Dispute Reference: <strong className="font-mono">DSP-{bookingId}</strong>. Our
              support team reviews evidence within 24 hours.
            </span>
          </div>
        )}
      </div>

      {/* High-Contrast Single-Use QR Pass */}
      {canShowQr && (
        <section className="surface-card flex flex-col items-center space-y-4 border-2 border-ink-950 bg-white p-6 text-center">
          <div className="flex items-center gap-2 text-sm font-extrabold text-ink-950">
            <QrCode className="h-5 w-5" />
            High-Contrast Single-Use Check-In Pass
          </div>

          <div
            aria-label="High contrast QR code pass"
            className="rounded-2xl border-4 border-ink-950 bg-white p-4"
          >
            <svg
              width="160"
              height="160"
              viewBox="0 0 160 160"
              role="img"
              aria-label={`QR Pass ${qrToken}`}
            >
              <rect width="160" height="160" fill="#ffffff" />
              {/* Deterministic high-contrast QR finder & data blocks */}
              <rect x="8" y="8" width="40" height="40" fill="#000000" />
              <rect x="16" y="16" width="24" height="24" fill="#ffffff" />
              <rect x="22" y="22" width="12" height="12" fill="#000000" />

              <rect x="112" y="8" width="40" height="40" fill="#000000" />
              <rect x="120" y="16" width="24" height="24" fill="#ffffff" />
              <rect x="126" y="22" width="12" height="12" fill="#000000" />

              <rect x="8" y="112" width="40" height="40" fill="#000000" />
              <rect x="16" y="120" width="24" height="24" fill="#ffffff" />
              <rect x="22" y="126" width="12" height="12" fill="#000000" />

              <rect x="60" y="16" width="12" height="12" fill="#000000" />
              <rect x="84" y="16" width="16" height="16" fill="#000000" />
              <rect x="60" y="44" width="20" height="12" fill="#000000" />
              <rect x="20" y="64" width="16" height="16" fill="#000000" />
              <rect x="52" y="64" width="24" height="24" fill="#000000" />
              <rect x="88" y="68" width="16" height="16" fill="#000000" />
              <rect x="116" y="64" width="28" height="16" fill="#000000" />
              <rect x="64" y="100" width="20" height="20" fill="#000000" />
              <rect x="96" y="96" width="20" height="16" fill="#000000" />
              <rect x="124" y="112" width="24" height="24" fill="#000000" />
              <rect x="64" y="132" width="32" height="16" fill="#000000" />
            </svg>
          </div>

          <p className="rounded-lg bg-ink-950 px-4 py-2 font-mono text-xs font-bold tracking-wider text-white">
            {qrToken}
          </p>

          {bookingState === 'Checked In' ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Scanned &amp; Checked In (Single-use token consumed)
            </p>
          ) : (
            <p className="text-xs text-ink-600">
              Valid for one scan only. Second scan will be rejected with the first-scan timestamp.
            </p>
          )}
        </section>
      )}

      {/* Cancellation & Refund UI */}
      {canRequestRefund && (
        <section className="surface-card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink-950">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                Need to Cancel or Request a Refund?
              </h2>
              <p className="text-xs text-ink-600">
                Policy: Free cancellation up to 24h before slot; 50% refund between 6h and 24h.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRefundForm((v) => !v)}
              className="btn-danger min-h-[44px] text-xs"
            >
              <XCircle className="h-4 w-4" />
              {showRefundForm ? 'Close' : 'Request Refund'}
            </button>
          </div>

          {showRefundForm && (
            <form onSubmit={handleRequestRefund} className="space-y-3 border-t border-ink-100 pt-3">
              <div>
                <label className="label-text" htmlFor="refund-reason">
                  Reason for cancellation
                </label>
                <select
                  id="refund-reason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="input-field min-h-[44px] text-xs"
                >
                  <option>Schedule conflict</option>
                  <option>Booked wrong slot or date</option>
                  <option>Provider requested reschedule</option>
                  <option>Other</option>
                </select>
              </div>
              <button type="submit" className="btn-danger min-h-[44px] text-xs">
                Confirm Cancellation &amp; Submit Refund
              </button>
            </form>
          )}
        </section>
      )}

      {/* 12-State Lifecycle Preview Switcher (for QA / Edge-case inspection) */}
      <section className="surface-card space-y-3 p-5">
        <h2 className="text-xs font-extrabold tracking-wider text-ink-600 uppercase">
          Booking Lifecycle State Preview (12 Valid States)
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {VALID_BOOKING_STATES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setBookingState(st)}
              className={`min-h-[44px] rounded-lg border px-3 text-xs font-bold transition ${
                bookingState === st
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
          <div className="skeleton h-8 w-1/3" />
          <div className="skeleton h-48 w-full" />
        </div>
      }
    >
      <BookingDetailContent />
    </Suspense>
  );
}
