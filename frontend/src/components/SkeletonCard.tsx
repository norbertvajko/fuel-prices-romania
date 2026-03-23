const SkeletonCard = () => (
  <div className="group relative rounded-2xl bg-card border border-border/50 overflow-hidden shadow-[0_1px_4px_0_hsl(var(--foreground)/0.03),0_6px_20px_0_hsl(var(--foreground)/0.04)] animate-pulse">
    {/* Left border accent placeholder */}
    <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-full bg-muted" />

    <div className="p-4 sm:p-6 pb-5">
      {/* Header: Title + Network + Address */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {/* Title and network badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="h-6 w-40 rounded bg-muted" />
            <div className="h-5 w-20 rounded-full bg-muted" />
          </div>

          {/* Address */}
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded bg-muted" />
            <div className="h-4 w-32 sm:w-48 rounded bg-muted" />
          </div>

          {/* Update date */}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-muted" />
            <div className="h-3 w-28 sm:w-32 rounded bg-muted" />
          </div>
        </div>

        {/* Price area */}
        <div className="shrink-0 text-right space-y-1">
          <div className="h-8 w-16 rounded bg-muted ml-auto" />
          <div className="h-3 w-10 rounded bg-muted ml-auto" />
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="mt-4 -mx-1 h-28 w-full rounded-lg bg-muted/50" />

      {/* Fuel price pills */}
      <div className="mt-4 flex flex-wrap gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="inline-flex items-center gap-2 rounded-xl bg-muted/50 border border-border/40 px-3 py-2">
            <div className="h-3.5 w-3.5 rounded bg-muted" />
            <div className="h-4 w-8 rounded bg-muted" />
            <div className="h-4 w-10 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Services placeholder */}
      <div className="mt-5 pt-4 border-t border-border/40">
        <div className="h-3 w-16 rounded bg-muted mb-2.5" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-accent/60 border border-border/30 px-2.5 py-1.5">
              <div className="h-3 w-3 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Footer actions */}
    <div className="flex items-center gap-2 border-t border-border/40 bg-muted/20 px-4 sm:px-6 py-3">
      <div className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-10 rounded bg-muted" />
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-14 rounded bg-muted" />
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2">
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-8 rounded bg-muted" />
      </div>
    </div>
  </div>
);

export default SkeletonCard;
