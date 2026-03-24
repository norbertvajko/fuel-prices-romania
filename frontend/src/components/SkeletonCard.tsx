const SkeletonCard = () => (
  <div className="group relative rounded-2xl bg-card border border-border/50 overflow-hidden shadow-[0_1px_4px_0_hsl(var(--foreground)/0.03),0_6px_20px_0_hsl(var(--foreground)/0.04)] animate-pulse">
    {/* Left border accent placeholder */}
    <div className="absolute left-0 top-0 bottom-0 w-1 rounded sm:w-1.5 rounded-r-full bg-muted" />

    <div className="p-3 sm:p-6 pb-4 sm:pb-5">
      {/* Header: Title + Network + Address */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          {/* Title and network badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-5 sm:h-6 w-32 sm:w-40 rounded bg-muted" />
            <div className="h-4 sm:h-5 w-16 sm:w-20 rounded-full bg-muted" />
          </div>

          {/* Address */}
          <div className="flex items-center gap-1">
            <div className="h-3 sm:h-3.5 w-3 sm:w-3.5 rounded bg-muted" />
            <div className="h-3.5 sm:h-4 w-24 sm:w-32 md:w-48 rounded bg-muted" />
          </div>

          {/* Update date */}
          <div className="flex items-center gap-1">
            <div className="h-2.5 sm:h-3 w-2.5 sm:w-3 rounded bg-muted" />
            <div className="h-3 sm:h-3 w-20 sm:w-28 md:w-32 rounded bg-muted" />
          </div>
        </div>

        {/* Price area */}
        <div className="shrink-0 text-right space-y-1">
          <div className="h-7 sm:h-8 w-14 sm:w-16 rounded bg-muted ml-auto" />
          <div className="h-2.5 sm:h-3 w-8 sm:w-10 rounded bg-muted ml-auto" />
        </div>
      </div>

      {/* Chart placeholder */}
      <div className="mt-3 sm:mt-4 -mx-1 h-24 sm:h-28 w-full rounded-lg bg-muted/50" />

      {/* Fuel price pills */}
      <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-muted/50 border border-border/40 px-2 sm:px-3 py-1.5 sm:py-2">
            <div className="h-3 sm:h-3.5 w-3 sm:w-3.5 rounded bg-muted" />
            <div className="h-3.5 sm:h-4 w-6 sm:w-8 rounded bg-muted" />
            <div className="h-3.5 sm:h-4 w-8 sm:w-10 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Services placeholder */}
      <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-border/40">
        <div className="h-3 w-12 sm:w-16 rounded bg-muted mb-2" />
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="inline-flex items-center gap-1 rounded-lg bg-accent/60 border border-border/30 px-2 py-1">
              <div className="h-2.5 sm:h-3 w-2.5 sm:w-3 rounded bg-muted" />
              <div className="h-2.5 sm:h-3 w-10 sm:w-12 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Footer actions */}
    <div className="flex items-center gap-1 sm:gap-2 border-t border-border/40 bg-muted/20 px-3 sm:px-6 py-2 sm:py-3">
      <div className="inline-flex items-center gap-1 rounded-lg px-2 sm:px-3.5 py-1.5">
        <div className="h-3.5 sm:h-4 w-3.5 sm:w-4 rounded bg-muted" />
        <div className="h-3.5 sm:h-4 w-8 sm:w-10 rounded bg-muted" />
      </div>
      <div className="inline-flex items-center gap-1 rounded-lg px-2 sm:px-3.5 py-1.5">
        <div className="h-3.5 sm:h-4 w-3.5 sm:w-4 rounded bg-muted" />
        <div className="h-3.5 sm:h-4 w-10 sm:w-14 rounded bg-muted" />
      </div>
      <div className="inline-flex items-center gap-1 rounded-lg px-2 sm:px-3.5 py-1.5">
        <div className="h-3.5 sm:h-4 w-3.5 sm:w-4 rounded bg-muted" />
        <div className="h-3.5 sm:h-4 w-6 sm:w-8 rounded bg-muted" />
      </div>
    </div>
  </div>
);

export default SkeletonCard;
