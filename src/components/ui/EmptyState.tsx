import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
      <h3 className="text-base font-bold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-ink-600">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="btn-primary mt-5">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
