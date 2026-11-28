'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ProofRecommendations } from '@/components/customer/ProofRecommendations';
import { formatInr } from '@/lib/format';

interface TimeSlot {
  id: string;
  label: string;
  remainingCapacity: number;
}

interface DayAvailability {
  date: string;
  displayDate: string;
  slots: TimeSlot[];
}

interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  pricePaise: number;
  inclusions: string[];
  exclusions: string[];
  providerName: string;
  providerCity: string;
  cancellationPolicy: string;
  availability: DayAvailability[];
}

function buildDefaultAvailability(): DayAvailability[] {
  const days: DayAvailability[] = [];
  const now = new Date();
  for (let i = 0; i < 5; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const displayDate = d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    days.push({
      date: iso,
      displayDate,
      slots: [
        { id: `${iso}-1000`, label: '10:00 AM – 11:00 AM IST', remainingCapacity: 4 },
        { id: `${iso}-1400`, label: '02:00 PM – 03:00 PM IST', remainingCapacity: 2 },
        { id: `${iso}-1730`, label: '05:30 PM – 06:30 PM IST', remainingCapacity: 1 },
      ],
    });
  }
  return days;
}

export default function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const serviceId = params?.id || 'svc-wellness-01';
  const { actor, ready } = useAuth();
  const router = useRouter();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    async function fetchDetail() {
      setLoading(true);
      const defaultDays = buildDefaultAvailability();
      try {
        const res = await fetch('/api/products', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const match = (data?.products || []).find(
            (p: Record<string, unknown>) =>
              String(p.id) === serviceId || String(p.slug) === serviceId
          );
          if (match && !cancelled) {
            const biz = (match.business as Record<string, unknown> | undefined) || {};
            setService({
              id: String(match.id),
              title: String(match.title || match.name || 'Local Service'),
              description: String(
                match.description ||
                  'Verified VALUEOUS local service with transparent inclusions and instant QR check-in.'
              ),
              pricePaise:
                typeof match.pricePaise === 'number'
                  ? match.pricePaise
                  : typeof match.price_paise === 'number'
                    ? match.price_paise
                    : 249900,
              inclusions: Array.isArray(match.inclusions)
                ? match.inclusions.map(String)
                : ['Full scheduled session', 'Verified provider check-in', 'Digital QR pass'],
              exclusions: Array.isArray(match.exclusions)
                ? match.exclusions.map(String)
                : ['Travel to venue', 'Optional add-ons purchased on-site'],
              providerName:
                typeof biz.brandName === 'string' ? biz.brandName : 'VALUEOUS Verified Partner',
              providerCity: typeof biz.city === 'string' ? biz.city : 'Bengaluru',
              cancellationPolicy:
                'Free cancellation up to 24 hours before your scheduled slot; 50% refund up to 6 hours prior.',
              availability: defaultDays,
            });
            setSelectedDate(defaultDays[0].date);
            setSelectedSlotId(defaultDays[0].slots[0].id);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Use fallback detail below
      }

      if (!cancelled) {
        setService({
          id: serviceId,
          title: 'Ayurvedic Deep Tissue & Recovery Session (60 min)',
          description:
            'Restorative full-body therapy with herbal oils, posture assessment, and post-session hydration.',
          pricePaise: 249900,
          inclusions: [
            '60-min certified therapist session',
            'Warm herbal oil blend',
            'Post-session herbal infusion',
            'Instant single-use QR check-in pass',
          ],
          exclusions: [
            'Home-visit travel surcharge',
            'Additional steam or sauna upgrade',
          ],
          providerName: 'Prana Studio Indiranagar',
          providerCity: 'Bengaluru',
          cancellationPolicy:
            'Free cancellation up to 24 hours before your scheduled slot; 50% refund between 6 and 24 hours.',
          availability: defaultDays,
        });
        setSelectedDate(defaultDays[0].date);
        setSelectedSlotId(defaultDays[0].slots[0].id);
        setLoading(false);
      }
    }
    void fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  const activeDay = useMemo(
    () => service?.availability.find((d) => d.date === selectedDate) || service?.availability[0],
    [service, selectedDate]
  );

  const activeSlot = useMemo(
    () => activeDay?.slots.find((s) => s.id === selectedSlotId) || activeDay?.slots[0],
    [activeDay, selectedSlotId]
  );

  function handleProceedToCheckout() {
    if (!service || !activeSlot || !activeDay) return;
    const target = `/customer/checkout?serviceId=${encodeURIComponent(service.id)}&slotId=${encodeURIComponent(activeSlot.id)}&date=${encodeURIComponent(activeDay.date)}&slotLabel=${encodeURIComponent(activeSlot.label)}&title=${encodeURIComponent(service.title)}&pricePaise=${service.pricePaise}`;
    if (ready && !actor) {
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  }

  if (loading || !service) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4" aria-busy="true">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-28 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      <Link
        href="/customer/explore"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Explore
      </Link>

      {/* Header + Price + Provider */}
      <div className="surface-card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-ink-950 sm:text-3xl">{service.title}</h1>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-600">
              <MapPin className="h-4 w-4 text-brand-600" />
              {service.providerName} · {service.providerCity}
            </p>
          </div>
          <div className="rounded-xl bg-brand-50 px-4 py-2.5 text-right">
            <p className="text-[11px] font-bold tracking-wide text-brand-800 uppercase">
              Total Price
            </p>
            <p className="text-2xl font-extrabold text-brand-700">
              {formatInr(service.pricePaise)}
            </p>
          </div>
        </div>
        <p className="text-sm text-ink-700">{service.description}</p>
      </div>

      {/* Mandatory Pre-Checkout Disclosures: Inclusions, Exclusions, Cancellation Policy */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="surface-card space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            What’s Included
          </h2>
          <ul className="space-y-2 text-xs text-ink-700">
            {service.inclusions.map((inc) => (
              <li key={inc} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-ink-950">
            <XCircle className="h-5 w-5 text-amber-600" />
            What’s Excluded
          </h2>
          <ul className="space-y-2 text-xs text-ink-700">
            {service.exclusions.map((exc) => (
              <li key={exc} className="flex items-start gap-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>{exc}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="surface-card flex items-start gap-3 border-brand-200 bg-brand-50/40 p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
        <div>
          <h2 className="text-sm font-extrabold text-ink-950">Cancellation &amp; Refund Policy</h2>
          <p className="mt-1 text-xs text-ink-700">{service.cancellationPolicy}</p>
        </div>
      </section>

      {/* Availability Calendar & Slot Picker */}
      <section className="surface-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink-950">
            <Calendar className="h-5 w-5 text-brand-600" />
            Select Date &amp; Time Slot
          </h2>
          <span className="text-xs font-semibold text-ink-500">All times in IST</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {service.availability.map((day) => {
            const isSelected = day.date === activeDay?.date;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  setSelectedDate(day.date);
                  if (day.slots[0]) setSelectedSlotId(day.slots[0].id);
                }}
                className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  isSelected
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-ink-200 bg-white text-ink-800 hover:border-brand-400'
                }`}
              >
                {day.displayDate}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {activeDay?.slots.map((slot) => {
            const isSelected = slot.id === activeSlot?.id;
            return (
              <button
                key={slot.id}
                type="button"
                disabled={slot.remainingCapacity <= 0}
                onClick={() => setSelectedSlotId(slot.id)}
                className={`min-h-[44px] flex flex-col items-start justify-center rounded-xl border px-4 py-2.5 text-left transition ${
                  isSelected
                    ? 'border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-600/30'
                    : 'border-ink-200 bg-white text-ink-800 hover:border-brand-400'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <Clock className="h-3.5 w-3.5 text-brand-600" />
                  {slot.label}
                </span>
                <span className="mt-0.5 text-[11px] text-ink-500">
                  {slot.remainingCapacity} {slot.remainingCapacity === 1 ? 'spot' : 'spots'} left
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleProceedToCheckout}
            disabled={!activeSlot}
            className="btn-primary min-h-[48px] w-full text-sm font-extrabold"
          >
            Hold Slot (5 Min) &amp; Continue to Checkout — {formatInr(service.pricePaise)}
          </button>
        </div>
      </section>

      {/* Proof-based Creator Recommendations */}
      <ProofRecommendations limit={3} />
    </div>
  );
}
