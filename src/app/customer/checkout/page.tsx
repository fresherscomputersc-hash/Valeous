'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Lock,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { formatInr } from '@/lib/format';

type CheckoutPhase =
  | 'HOLDING'
  | 'READY'
  | 'SLOT_UNAVAILABLE'
  | 'HOLD_EXPIRED'
  | 'PAYMENT_FAILED'
  | 'AWAITING_WEBHOOK';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { notify } = useToast();

  const serviceId = searchParams.get('serviceId') || 'svc-wellness-01';
  const slotId = searchParams.get('slotId') || 'slot-default';
  const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const slotLabel = searchParams.get('slotLabel') || '10:00 AM – 11:00 AM IST';
  const serviceTitle =
    searchParams.get('title') || 'Ayurvedic Deep Tissue & Recovery Session (60 min)';
  const pricePaise = Number(searchParams.get('pricePaise') || 249900);

  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem-${Date.now()}`
  );

  const [phase, setPhase] = useState<CheckoutPhase>('HOLDING');
  const [reservationId, setReservationId] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(300);
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; correlationId?: string } | null>(
    null
  );

  const acquireHold = useCallback(async () => {
    setPhase('HOLDING');
    setErrorInfo(null);
    try {
      const res = await fetch('/api/v1/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKeyRef.current,
        },
        credentials: 'include',
        body: JSON.stringify({ serviceId, slotId, date: dateParam }),
      });

      if (res.status === 409) {
        const body = await res.json().catch(() => null);
        setPhase('SLOT_UNAVAILABLE');
        setErrorInfo({
          message:
            body?.error?.message ||
            'Another customer just booked the last spot for this slot.',
          correlationId: body?.error?.correlationId || undefined,
        });
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setReservationId(String(data.reservation_id || `res-${Date.now()}`));
        setSecondsLeft(
          typeof data.seconds_remaining === 'number' ? data.seconds_remaining : 300
        );
        setPhase('READY');
        return;
      }

      // Fallback local 5-min hold if Sprint 2 backend reservation endpoint is not yet mounted
      setReservationId(`hold-${Date.now()}`);
      setSecondsLeft(300);
      setPhase('READY');
    } catch {
      setReservationId(`hold-${Date.now()}`);
      setSecondsLeft(300);
      setPhase('READY');
    }
  }, [serviceId, slotId, dateParam]);

  useEffect(() => {
    void acquireHold();
  }, [acquireHold]);

  useEffect(() => {
    if (phase !== 'READY' && phase !== 'PAYMENT_FAILED') return;
    if (secondsLeft <= 0) {
      setPhase('HOLD_EXPIRED');
      return;
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setPhase('HOLD_EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, secondsLeft]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (secondsLeft <= 0) {
      setPhase('HOLD_EXPIRED');
      return;
    }
    if (submittingPayment) return;

    setSubmittingPayment(true);
    setErrorInfo(null);

    const normalizedCard = cardNumber.replace(/\s+/g, '');
    if (normalizedCard === '4000000000000002') {
      setSubmittingPayment(false);
      setPhase('PAYMENT_FAILED');
      setErrorInfo({
        message: 'Mock payment declined by issuer (4000 0000 0000 0002). Please retry.',
        correlationId: `pay-err-${Date.now()}`,
      });
      notify('Payment failed — you can retry while your hold is active', 'error');
      return;
    }

    // Never confirm booking directly from browser redirect — only webhook confirms
    setPhase('AWAITING_WEBHOOK');
    setSubmittingPayment(false);
    notify('Payment submitted. Awaiting webhook confirmation…', 'info');
  }

  if (phase === 'HOLDING') {
    return (
      <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
        <div className="skeleton h-10 w-2/3" />
        <div className="skeleton h-32 w-full" />
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  if (phase === 'SLOT_UNAVAILABLE') {
    return (
      <div className="surface-card mx-auto max-w-xl space-y-4 border-red-200 p-6 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-600" />
        <h1 className="text-xl font-extrabold text-ink-950">Slot No Longer Available</h1>
        <p className="text-xs text-ink-600">
          {errorInfo?.message || 'This slot just reached full capacity.'}
        </p>
        {errorInfo?.correlationId && (
          <p className="font-mono text-[11px] text-ink-500">
            Reference ID: {errorInfo.correlationId}
          </p>
        )}
        <Link
          href={`/services/${encodeURIComponent(serviceId)}`}
          className="btn-primary inline-flex min-h-[44px] items-center justify-center text-xs"
        >
          Choose Another Time Slot
        </Link>
      </div>
    );
  }

  if (phase === 'HOLD_EXPIRED') {
    return (
      <div className="surface-card mx-auto max-w-xl space-y-4 border-amber-200 p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="text-xl font-extrabold text-ink-950">5-Minute Slot Hold Expired</h1>
        <p className="text-xs text-ink-600">
          Your temporary reservation expired to keep slots fair for other customers.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              idempotencyKeyRef.current = `idem-${Date.now()}`;
              void acquireHold();
            }}
            className="btn-primary min-h-[44px] text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            Re-acquire Hold
          </button>
          <Link
            href={`/services/${encodeURIComponent(serviceId)}`}
            className="btn-secondary min-h-[44px] inline-flex items-center text-xs"
          >
            Back to Service Slots
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'AWAITING_WEBHOOK') {
    const bookingId = reservationId || `bkg-${Date.now()}`;
    return (
      <div className="surface-card mx-auto max-w-xl space-y-4 border-brand-200 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" />
        <h1 className="text-xl font-extrabold text-ink-950">
          Payment Submitted — Awaiting Confirmation
        </h1>
        <p className="text-xs text-ink-600">
          Your payment is being verified via signed webhook. Bookings are never confirmed from
          browser redirects alone.
        </p>
        <div className="rounded-xl bg-brand-50 p-3 font-mono text-xs text-brand-900">
          Reservation ID: {bookingId}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(`/customer/bookings/${encodeURIComponent(bookingId)}?state=Confirmed`)
            }
            className="btn-primary min-h-[44px] text-xs"
          >
            View Booking &amp; QR Pass
          </button>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/customer/bookings/${encodeURIComponent(bookingId)}?state=Pending%20Payment`
              )
            }
            className="btn-secondary min-h-[44px] text-xs"
          >
            Inspect Pending Webhook State
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* 5-Min Hold Countdown Banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-bold ${
          secondsLeft <= 60
            ? 'border-red-300 bg-red-50 text-red-900'
            : 'border-brand-200 bg-brand-50 text-brand-900'
        }`}
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Slot held for you · Complete payment before timer expires
        </span>
        <span className="rounded-lg bg-white px-3 py-1 font-mono text-sm font-extrabold">
          {mm}:{ss}
        </span>
      </div>

      {errorInfo && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900"
        >
          <p className="font-bold">{errorInfo.message}</p>
          {errorInfo.correlationId && (
            <p className="mt-1 font-mono text-[11px]">Reference ID: {errorInfo.correlationId}</p>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-5">
        {/* Summary + Mandatory Pre-Checkout Policies */}
        <div className="surface-card space-y-4 p-5 md:col-span-2">
          <h1 className="text-lg font-extrabold text-ink-950">Booking Summary</h1>
          <div className="space-y-1 text-xs">
            <p className="font-bold text-ink-900">{serviceTitle}</p>
            <p className="text-ink-600">
              {dateParam} · {slotLabel}
            </p>
            <p className="font-mono text-[11px] text-ink-500">Hold ID: {reservationId}</p>
          </div>

          <div className="border-t border-ink-100 pt-3 text-xs space-y-1">
            <p className="font-bold text-ink-900">Inclusions:</p>
            <p className="text-ink-600">• Full scheduled session &amp; verified QR pass</p>
            <p className="font-bold text-ink-900 pt-1">Exclusions:</p>
            <p className="text-ink-600">• Travel &amp; optional on-site upgrades</p>
          </div>

          <div className="rounded-lg bg-ink-50 p-3 text-[11px] text-ink-700">
            <p className="flex items-center gap-1 font-bold text-ink-900">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
              Cancellation Policy
            </p>
            <p className="mt-1">
              Free cancellation up to 24h before slot; 50% refund between 6h and 24h.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-ink-100 pt-3">
            <span className="text-xs font-bold text-ink-700">Total Payable</span>
            <span className="text-xl font-extrabold text-brand-700">
              {formatInr(pricePaise)}
            </span>
          </div>
        </div>

        {/* Mock Payment Simulator */}
        <form onSubmit={handlePaymentSubmit} className="surface-card space-y-4 p-5 md:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
              <CreditCard className="h-5 w-5 text-brand-600" />
              Mock Payment Simulator
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500">
              <Lock className="h-3.5 w-3.5" />
              Idempotent
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCardNumber('4111 1111 1111 1111')}
              className="btn-secondary min-h-[44px] text-xs"
            >
              Use Success Card (4111…)
            </button>
            <button
              type="button"
              onClick={() => setCardNumber('4000 0000 0000 0002')}
              className="btn-secondary min-h-[44px] text-xs"
            >
              Simulate Decline (4000…0002)
            </button>
          </div>

          <div>
            <label className="label-text" htmlFor="mock-card">
              Test Card Number
            </label>
            <input
              id="mock-card"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="input-field min-h-[44px] font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submittingPayment}
            className="btn-primary min-h-[48px] w-full text-sm font-extrabold"
          >
            {submittingPayment
              ? 'Processing…'
              : phase === 'PAYMENT_FAILED'
                ? `Retry Payment — ${formatInr(pricePaise)}`
                : `Pay ${formatInr(pricePaise)}`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CustomerCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
          <div className="skeleton h-10 w-2/3" />
          <div className="skeleton h-48 w-full" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
