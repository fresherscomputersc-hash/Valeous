import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="surface-card mx-auto max-w-lg px-6 py-16 text-center">
      <p className="text-xs font-bold tracking-widest text-brand-700 uppercase">404 — Not Found</p>
      <h1 className="mt-2 text-2xl font-extrabold text-ink-950">
        This page or listing isn’t available
      </h1>
      <p className="mt-2 text-sm text-ink-600">
        The recommendation, offer, or profile may have been unpublished, archived, or never existed.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back to Discovery
        </Link>
        <Link href="/search" className="btn-secondary">
          Search Listings
        </Link>
      </div>
    </div>
  );
}
