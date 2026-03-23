import { TrendingDown, TrendingUp, MapPin, Clock, RefreshCw } from "lucide-react";
import { FUEL_LABELS, FUEL_COLORS, type FuelType } from "../data/stations";
import { capitalizeFirst } from "../lib/utilts";
import type { Station } from "../types";

interface CityAveragesProps {
    city: string;
    stations: Station[];
    onRefresh?: () => void;
    isRefreshing?: boolean;
    isLoading?: boolean;
    canRefresh?: boolean;
    lastUpdated?: string;
}

// Map API fuel names to our FuelType
// API returns: "Benzină 95", "Benzină 98", "Motorină standard", "Motorină premium", "GPL", "Incarcare Electrica"
const fuelNameMap: Record<string, FuelType> = {
    // Benzine
    "benzină 95": "b95",
    "benzina 95": "b95",
    "benzină 98": "b98",
    "benzina 98": "b98",
    "b95": "b95",
    "b98": "b98",
    // Motorine
    "motorină standard": "diesel",
    "motorina standard": "diesel",
    "motorină premium": "diesel_plus",
    "motorina premium": "diesel_plus",
    "diesel": "diesel",
    // GPL
    "gpl": "gpl",
    // Electric (map to gpl as fallback)
    "incarcare electrica": "gpl",
    "electric": "gpl",
};

function computeAverages(stations: Station[]) {
    const fuelMap = new Map<FuelType, number[]>();

    for (const station of stations) {
        for (const fuel of station.prices || []) {
            const type = fuelNameMap[fuel.fuel.toLowerCase()];
            if (!type) continue;
            
            if (!fuelMap.has(type)) fuelMap.set(type, []);
            fuelMap.get(type)!.push(fuel.price);
        }
    }

    const order: FuelType[] = ["diesel", "diesel_plus", "b95", "b98", "gpl"];

    return order
        .filter((t) => fuelMap.has(t))
        .map((type) => {
            const prices = fuelMap.get(type)!;
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return { type, avg, min, max };
        });
}

const CityAverages = ({ city, stations, onRefresh, isRefreshing, isLoading, canRefresh, lastUpdated }: CityAveragesProps) => {
    const fuelAverages = computeAverages(stations);

    // Show skeleton when refreshing or loading
    if (isRefreshing || isLoading) {
        return (
            <div className="rounded-xl bg-card border shadow-sm overflow-hidden animate-pulse">
                <div className="bg-primary px-3 sm:px-5 py-2.5 sm:py-3">
                    <div className="h-6 w-32 bg-primary/20 rounded" />
                </div>
                <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="rounded-lg border bg-background p-3 flex flex-col items-center gap-2">
                            <div className="w-8 h-10 rounded bg-muted" />
                            <div className="h-3 w-16 rounded bg-muted" />
                            <div className="h-5 w-12 rounded bg-muted" />
                            <div className="h-2 w-20 rounded bg-muted" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (fuelAverages.length === 0) return null;

    // Parse the lastUpdated timestamp if available
    let displayTime = new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long" }) + " " + new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    if (lastUpdated) {
        try {
            const date = new Date(lastUpdated);
            if (!isNaN(date.getTime())) {
                displayTime = date.toLocaleDateString("ro-RO", { day: "numeric", month: "long" }) + " " + date.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
            }
        } catch {}
    }

    return (
        <div className="rounded-xl bg-card border shadow-sm overflow-hidden animate-fade-in-up">
            {/* Header strip */}
            <div className="bg-primary px-3 sm:px-5 py-2.5 sm:py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <div className="flex items-center gap-2 text-primary-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="font-semibold text-sm tracking-wide">
                        {stations.length} stații găsite
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-primary-foreground/70 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Prețuri medii pentru {capitalizeFirst(city)} • {displayTime}
                    </span>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing || !canRefresh}
                            className="p-1.5 rounded-md bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer"
                            title={!canRefresh ? "Trebuie să aștepți 10 minute între actualizări" : "Actualizează prețurile"}
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Price cards */}
            <div className="p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                {fuelAverages.map(({ type, avg, min, max }) => (
                    <div
                        key={type}
                        className="relative rounded-lg border bg-background p-3 flex flex-col items-center gap-2 group hover:shadow-md transition-shadow duration-200"
                    >
                        {/* Fuel color indicator */}
                        <div className={`w-8 h-10 rounded ${FUEL_COLORS[type]} opacity-90`} />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {FUEL_LABELS[type]}
                        </span>
                        <span className="text-xl font-bold tabular-nums text-foreground">
                            {avg.toFixed(2)}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                                <TrendingDown className="w-3 h-3 text-green-500" />
                                {min.toFixed(2)}
                            </span>
                            <span className="flex items-center gap-0.5">
                                <TrendingUp className="w-3 h-3 text-red-500" />
                                {max.toFixed(2)}
                            </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60">lei/l</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CityAverages;
