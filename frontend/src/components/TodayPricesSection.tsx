import { useEffect, useState } from "react";

interface FuelPrice {
  price: string;
  label: string;
}

interface TodayPricesSectionProps {
  prices: FuelPrice[];
}

const fuelDots: Record<string, string> = {
  "Motorină": "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]",
  "Motorină Plus": "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]",
  "Benzină 95": "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]",
  "Benzină 98": "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.6)]",
  "GPL": "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]",
};

const TodayPricesSection = ({ prices }: TodayPricesSectionProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (prices.length === 0) return null;

  return (
    <div className="mt-5">
      {/* Live indicator */}
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        Pretul live
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {prices.map((fuel, i) => (
          <span
            key={fuel.label}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
              bg-foreground/[0.04] border border-foreground/[0.08]
              backdrop-blur-md
              text-xs text-foreground/80
              hover:bg-foreground/[0.08] hover:border-foreground/[0.15]
              transition-all duration-300 cursor-default
              ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
            `}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <span className={`w-2 h-2 rounded-full ${fuelDots[fuel.label] || "bg-muted-foreground"}`} />
            <span className="text-muted-foreground font-medium">{fuel.label}</span>
            <span className="font-bold text-foreground tabular-nums">{fuel.price}</span>
            <span className="text-muted-foreground/60 text-[10px]">lei/l</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default TodayPricesSection;