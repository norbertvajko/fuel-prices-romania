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
    <Skeleton className="h-[350px] sm:h-[420px] w-full rounded-xl" />
  </div>
);

export const PriceCardSkeleton = () => (
  <div className="bg-card rounded-2xl border border-border p-5">
    <Skeleton className="w-full h-1 rounded-full mb-4" />
    <Skeleton className="h-3 w-20 mb-3" />
    <Skeleton className="h-8 w-24 mb-2" />
    <div className="flex gap-3 mt-3">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export const TodayPricesSkeleton = () => (
  <div>
    <div className="flex items-center justify-between mb-6">
      <div>
        <Skeleton className="h-6 w-44 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-7 w-48 rounded-full" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <PriceCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const StationCardSkeleton = () => (
  <div className="bg-card rounded-xl border border-border p-5">
    <div className="flex items-start gap-4">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1">
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-3 w-64 mb-3" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
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
