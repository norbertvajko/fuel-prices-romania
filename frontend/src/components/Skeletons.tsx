import { Skeleton } from "./ui/skeleton";

export const ChartSkeleton = () => (
  <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-lg">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
    <Skeleton className="h-[280px] sm:h-[350px] w-full rounded-xl" />
  </div>
);

export const PriceCardSkeleton = () => (
  <div className="bg-card rounded-2xl border border-border p-3">
    <Skeleton className="w-full h-1 rounded-full mb-4" />
    <Skeleton className="h-3 w-20 mb-3" />
    <Skeleton className="h-8 w-24 mb-2" />
    <div className="flex gap-3 mt-3">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export const StationCardSkeleton = () => (
  <div className="group relative rounded-2xl bg-card border border-border/50 overflow-hidden shadow-[0_1px_4px_0_hsl(var(--foreground)/0.03),0_6px_20px_0_hsl(var(--foreground)/0.04)]">
    <div className="p-4 sm:p-6 pb-5">
      {/* Header with name and network */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="shrink-0 text-right">
          <Skeleton className="h-11 w-11 rounded" />
        </div>
      </div>

      {/* Bar chart */}
      <div className="mt-4 -mx-1 h-28 w-full">
        <Skeleton className="h-full w-full rounded" />
      </div>

      {/* Fuel price pills - 6 pills to match fully loaded state */}
      <div className="mt-4 flex flex-wrap gap-2.5">
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Services section - 5 services to match fully loaded state */}
      <div className="mt-5 pt-4 border-t border-border/40">
        <Skeleton className="h-3 w-16 mb-2.5" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-16 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-14 rounded-lg" />
          <Skeleton className="h-7 w-18 rounded-lg" />
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      </div>

      {/* Contact section - expanded state */}
      <div className="my-4">
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Inline Map */}
      <div className="mb-3">
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    </div>

    {/* Footer actions */}
    <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-muted/30">
      <Skeleton className="h-8 w-16 rounded-lg" />
      <Skeleton className="h-8 w-20 rounded-lg" />
      <Skeleton className="h-8 w-14 rounded-lg" />
    </div>
  </div>
);

export const StationListSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <StationCardSkeleton key={i} />
    ))}
  </div>
);
