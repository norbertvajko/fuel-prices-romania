import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FuelPriceCardProps {
  name: string;
  price: number;
  change: number;
  colorClass: string;
}

const FuelPriceCard = ({ name, price, change, colorClass }: FuelPriceCardProps) => {
  const isUp = change > 0;
  const isDown = change < 0;

  return (
    <div className="relative overflow-hidden rounded-xl bg-secondary/60 border border-border/40 p-3.5 flex flex-col gap-2 hover:bg-accent/80 hover:border-border/60 transition-all duration-300 group">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
        <span className="text-xs text-muted-foreground font-medium truncate">{name}</span>
      </div>
      
      <div className="relative flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {price.toFixed(2)}
          </span>
          <span className="text-xs font-medium text-muted-foreground ml-1">lei/l</span>
        </div>
        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isUp 
            ? "bg-emerald-500/15 text-emerald-400" 
            : isDown 
              ? "bg-rose-500/15 text-rose-400" 
              : "bg-muted text-muted-foreground"
        }`}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          <span>{isUp ? "+" : ""}{change.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default FuelPriceCard;