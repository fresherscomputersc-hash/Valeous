'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="surface-card space-y-4 p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-ink-950">Something went wrong</h1>
        <p className="text-sm text-ink-600">
          We encountered an unexpected error while loading this view. Your saved items and active offer claims remain safe.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button type="button" onClick={() => reset()} className="btn-primary">
            <RotateCcw className="h-4 w-4" />
            <span>Try again</span>
          </button>
          <Link href="/" className="btn-secondary">
            Return to Discovery
          </Link>
        </div>
      </div>
    </div>
  );
}
