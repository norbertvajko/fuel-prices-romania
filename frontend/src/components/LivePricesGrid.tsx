import FuelPriceCard from "./FuelPriceCard";
import type { LiveFuelPrice } from "../types";

interface LivePricesGridProps {
  prices: LiveFuelPrice[];
}

const LivePricesGrid = ({ prices }: LivePricesGridProps) => {
  const today = new Date().toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Use passed prices or fallback to empty (will show loading state)
  const displayPrices = prices.length > 0 ? prices : null;

  return (
    <div className="w-full max-w-5xl mx-auto mb-10">
      <div className="relative overflow-hidden rounded-2xl border border-border dark:border-border/80 bg-card/40 dark:bg-card/60 backdrop-blur-xl p-5">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-fuel-gpl animate-pulse" />
            <div>
              <span className="text-sm font-semibold text-foreground">Prețuri live</span>
              <span className="ml-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-bold">{today}</span>
          </div>
        </div>

        {/* Grid */}
        {displayPrices ? (
          <div className="relative grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {displayPrices.map((fuel, index) => (
              <div
                key={fuel.name}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <FuelPriceCard {...fuel} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LivePricesGrid;