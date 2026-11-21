import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PAID: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  DEPOSIT: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  SALE_REFUND_CREDIT: 'bg-sky-50 text-sky-800 border-sky-200',
  INFLUENCER: 'bg-creator-50 text-creator-800 border-creator-200',
  BUSINESS: 'bg-business-50 text-business-800 border-business-200',
  CUSTOMER: 'bg-brand-50 text-brand-800 border-brand-200',
  ADMIN: 'bg-purple-50 text-purple-800 border-purple-200',
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  PENDING_CLEARANCE: 'bg-amber-50 text-amber-800 border-amber-200',
  PAUSED: 'bg-amber-50 text-amber-800 border-amber-200',
  SALE_COMMISSION_DEBIT: 'bg-amber-50 text-amber-800 border-amber-200',
  ENDED: 'bg-ink-100 text-ink-600 border-ink-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  REFUNDED: 'bg-red-50 text-red-800 border-red-200',
  SUSPENDED: 'bg-red-50 text-red-800 border-red-200',
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || 'bg-ink-100 text-ink-700 border-ink-200';
  const label = status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${style}`}
    >
      {label}
    </span>
  );
}
