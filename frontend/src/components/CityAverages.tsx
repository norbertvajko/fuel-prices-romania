import { TrendingDown, TrendingUp, MapPin, Clock } from "lucide-react";
import { FUEL_LABELS, FUEL_COLORS, type FuelType } from "../data/stations";
import { capitalizeFirst } from "../lib/utilts";
import type { Station, Price } from "../types";

interface CityAveragesProps {
    city: string;
    stations: Station[];
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

const CityAverages = ({ city, stations }: CityAveragesProps) => {
    const fuelAverages = computeAverages(stations);

    if (fuelAverages.length === 0) return null;

    return (
        <div className="rounded-xl bg-card border shadow-sm overflow-hidden animate-fade-in-up">
            {/* Header strip */}
            <div className="bg-primary px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="font-semibold text-sm tracking-wide">
                        {stations.length} stații găsite
                    </span>
                </div>
                <span className="text-primary-foreground/70 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Prețuri medii pentru {capitalizeFirst(city)} • {new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long" })} {new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>

            {/* Price cards */}
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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