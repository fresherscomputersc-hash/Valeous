export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page content">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-ink-200/60" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="surface-card overflow-hidden p-4">
            <div className="h-44 w-full animate-pulse rounded-xl bg-ink-200/60" />
            <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-ink-200/60" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-ink-200/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
