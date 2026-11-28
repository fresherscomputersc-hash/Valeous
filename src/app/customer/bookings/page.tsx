'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, QrCode, ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatInr } from '@/lib/format';

const SAMPLE_BOOKINGS = [
  {
    id: 'bkg-confirmed-001',
    serviceTitle: 'Ayurvedic Deep Tissue & Recovery Session (60 min)',
    providerName: 'Prana Studio Indiranagar',
    slot: 'Today, 04:00 PM IST',
    amountPaise: 249900,
    state: 'Confirmed',
  },
  {
    id: 'bkg-pending-002',
    serviceTitle: 'Chef’s 5-Course Coastal Tasting Experience',
    providerName: 'Tide & Table Bandra',
    slot: 'Tomorrow, 07:30 PM IST',
    amountPaise: 320000,
    state: 'Pending Approval',
  },
];

export default function CustomerBookingsListPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">My Bookings &amp; QR Passes</h1>
          <p className="mt-1 text-xs text-ink-600">
            View booking statuses, single-use check-in QR passes, and refund requests.
          </p>
        </div>
        <Link href="/customer/explore" className="btn-primary min-h-[44px] inline-flex items-center text-xs">
          Explore More Services
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SAMPLE_BOOKINGS.map((b) => (
          <div key={b.id} className="surface-card flex flex-col justify-between space-y-3 p-5">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-extrabold text-ink-950">{b.serviceTitle}</h2>
                <StatusBadge status={b.state.toUpperCase().replace(/\s+/g, '_')} />
              </div>
              <p className="text-xs text-ink-600">{b.providerName}</p>
              <p className="flex items-center gap-1.5 text-xs text-ink-700">
                <Calendar className="h-3.5 w-3.5 text-brand-600" />
                {b.slot}
              </p>
              <p className="text-sm font-extrabold text-brand-700">{formatInr(b.amountPaise)}</p>
            </div>

            <Link
              href={`/customer/bookings/${b.id}?state=${encodeURIComponent(b.state)}`}
              className="btn-primary min-h-[44px] inline-flex items-center justify-center gap-2 text-xs"
            >
              <QrCode className="h-4 w-4" />
              Open Booking &amp; QR Pass
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
