export function formatDateTime(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '—';
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '—';

  const tz = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || 'Asia/Kolkata';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: tz,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function formatShortDate(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '—';
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '—';

  const tz = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || 'Asia/Kolkata';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: tz,
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatInr(paise: number | null | undefined): string {
  const safePaise = typeof paise === 'number' && Number.isFinite(paise) ? paise : 0;
  const rupees = safePaise / 100;
  const hasDecimals = safePaise % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatCompactNumber(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    n
  );
}
