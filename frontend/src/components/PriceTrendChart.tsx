import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { API_URL } from "../constants";
import { capitalizeFirst } from "../lib/utilts";

// Types for price history data
interface PriceHistoryItem {
  date: string;
  fuel_type: string;
  price: number;
}

interface PriceHistoryResponse {
  city: string;
  days: number;
  history: PriceHistoryItem[];
}

interface PriceTrendChartProps {
  city: string;
  isLoading?: boolean;
  isRefreshing?: boolean;
}

// Fuel type configuration
const FUEL_CONFIG = {
  diesel: { label: "Motorină", color: "#0ea5e9" },
  diesel_plus: { label: "Motorină+", color: "#0284c7" },
  b95: { label: "Benzină 95", color: "#f59e0b" },
  b98: { label: "Benzină 98", color: "#d97706" },
  gpl: { label: "GPL", color: "#10b981" },
};

const PriceTrendChart = ({ city, isLoading: externalLoading, isRefreshing: externalRefreshing }: PriceTrendChartProps) => {
  const [data, setData] = useState<PriceHistoryItem[]>([]);
  const [internalLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use external loading state or internal
  const loading = externalLoading || externalRefreshing || internalLoading;

  useEffect(() => {
    setData([]);
    setError(null);

    const fetchPriceHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/price-history?city=${encodeURIComponent(city)}&days=30`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch price history");
        }

        const result: PriceHistoryResponse = await response.json();
        setData(result.history);
      } catch (err) {
        console.error("Error fetching price history:", err);
        setError("Nu s-au putut încărca datele istorice");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceHistory();
  }, [city]);

  // Transform data for chart - group by date and pivot fuel types
  const chartData = useMemo(() => {
    if (!data.length) return [];

    const grouped: Record<string, Record<string, number>> = {};

    data.forEach((item) => {
      if (!grouped[item.date]) {
        grouped[item.date] = {};
      }
      grouped[item.date][item.fuel_type] = item.price;
    });

    return Object.entries(grouped).map(([date, prices]) => ({
      date: new Date(date).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "short",
      }),
      diesel: prices.diesel,
      diesel_plus: prices.diesel_plus,
      b95: prices.b95,
      b98: prices.b98,
      gpl: prices.gpl,
    }));
  }, [data]);

  // Show skeleton when loading
  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-3 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3 sm:mb-5">
          <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
          <div className="h-5 sm:h-6 w-32 sm:w-48 md:w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-[200px] sm:h-[300px] w-full flex flex-col gap-2 sm:gap-3 p-2 sm:p-4">
          {/* Header row skeleton - hidden on mobile, visible on sm+ */}
          <div className="hidden sm:flex gap-3 sm:gap-4">
            <div className="h-4 w-16 sm:w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 sm:w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 sm:w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 sm:w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 sm:w-20 bg-muted rounded animate-pulse" />
          </div>
          {/* Chart area skeleton */}
          <div className="flex-1 flex items-end gap-0.5 sm:gap-1 px-1 sm:px-2">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-muted rounded-t animate-pulse"
                style={{ height: `${20 + Math.random() * 70}%` }}
              />
            ))}
          </div>
          {/* Legend skeleton - wrap on mobile */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-5 mt-2 sm:mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-1 sm:gap-2">
                <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-muted animate-pulse" />
                <div className="h-3 sm:h-3 w-10 sm:w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-card-foreground">
            Evoluția prețurilor în {capitalizeFirst(city)} — ultimele 30 zile
          </h2>
        </div>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground text-sm">
            {error || "Nu există date istorice"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-base font-semibold text-card-foreground">
          Evoluția prețurilor în {capitalizeFirst(city)} — ultimele 30 zile
        </h2>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tick={{ fontSize: 11 }}
              interval={19}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
              tickFormatter={(v) => `${v} lei`}
              width={65}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px"
              }}
            />
            {Object.entries(FUEL_CONFIG).map(([key, fuel]) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={fuel.color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: fuel.color,
                  stroke: "white",
                  strokeWidth: 2,
                }}
                name={fuel.label}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5 mt-4">
        {Object.entries(FUEL_CONFIG).map(([key, fuel]) => (
          <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: fuel.color }}
            />
            {fuel.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PriceTrendChart;
