import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { fuelTypes } from "../data/mockFuelData";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { API_URL } from "../constants";

// Database keys to mockFuelData keys mapping
const fuelTypeMapping: Record<string, string> = {
  diesel: "motorina",
  diesel_plus: "motorina_plus",
  b95: "benzina95",
  b98: "benzina98",
  gpl: "gpl",
};

const chartConfig: ChartConfig = Object.fromEntries(
  fuelTypes.map((f) => [f.key, { label: f.label, color: f.color }])
);

const transformData = (
  history: Array<{ date: string; fuel_type: string; price: number }>
) => {
  const grouped: Record<string, Record<string, number>> = {};

  history.forEach((item) => {
    if (!grouped[item.date]) grouped[item.date] = {};

    const mappedKey =
      fuelTypeMapping[item.fuel_type] || item.fuel_type;

    grouped[item.date][mappedKey] = item.price;
  });

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return sortedDates.map((date) => ({
    date: new Date(date).toLocaleDateString("ro-RO", {
      month: "short",
      day: "numeric",
    }),
    motorina: grouped[date].motorina,
    motorina_plus: grouped[date].motorina_plus,
    benzina95: grouped[date].benzina95,
    benzina98: grouped[date].benzina98,
    gpl: grouped[date].gpl,
  }));
};

const YearlyChart = ({
  onLoadingComplete,
  onProgress,
}: {
  onLoadingComplete?: () => void;
  onProgress?: (progress: number) => void;
} = {}) => {
  const [data, setData] = useState<ReturnType<typeof transformData>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const startTime = Date.now();
      const estimatedDuration = 1500;

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(
          (elapsed / estimatedDuration) * 90,
          90
        );
        onProgress?.(progress);
      }, 50);

      try {
        const response = await fetch(
          `${API_URL}/price-history/national?days=365`
        );
        const result = await response.json();

        setData(transformData(result.history || []));
        onProgress?.(100);
      } catch (err) {
        // Handle error silently
        onProgress?.(100);
      } finally {
        clearInterval(progressInterval);
        setLoading(false);
        onLoadingComplete?.();
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="w-full mx-auto px-3 sm:px-4 mt-4 sm:-mt-12 relative z-10 max-w-[850px]">        <div className="bg-card rounded-2xl border border-border p-4 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <div className="h-5 sm:h-6 w-40 sm:w-48 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-3 sm:h-4 w-52 sm:w-64 bg-muted rounded animate-pulse mt-2" />
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-muted" />
                <div className="h-2.5 sm:h-3 w-8 sm:w-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="h-[320px] sm:h-[350px] w-full bg-muted/30 rounded-lg animate-pulse" />
      </div>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section className="w-full mx-auto px-3 sm:px-4 -mt-10 sm:-mt-12 relative z-10 max-w-[850px]">
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <h2 className="text-base sm:text-lg font-bold text-card-foreground">
                  Evoluția prețurilor
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Graficul prețurilor medii din Romania
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-4">
              {fuelTypes.map((fuel) => (
                <div
                  key={fuel.key}
                  className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground"
                >
                  <div
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                    style={{ backgroundColor: fuel.color }}
                  />
                  <span className="font-medium">{fuel.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-[320px] sm:h-[350px] flex items-center justify-center">
            <p className="text-muted-foreground text-xs sm:text-sm text-center">
              Nu există date istorice disponibile
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full mx-auto px-3 sm:px-4 -mt-10 sm:-mt-12 relative z-10 max-w-[850px]">
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-8 shadow-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-card-foreground">
                Evoluția prețurilor
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Graficul prețurilor medii din Romania
            </p>
          </div>

          {/* Legend (compact but full) */}
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 sm:pb-0">
            {fuelTypes.map((fuel) => (
              <div
                key={fuel.key}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs whitespace-nowrap"
              >
                <div
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                  style={{ backgroundColor: fuel.color }}
                />
                <span className="font-medium">{fuel.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <ChartContainer
          config={chartConfig}
          className="h-[320px] sm:h-[350px] w-full overflow-visible"
        >
          <AreaChart
            data={data}
            margin={{ top: 10, right: 5, left: -15, bottom: 0 }}
          >
            <defs>
              {fuelTypes.map((fuel) => (
                <linearGradient
                  key={fuel.key}
                  id={`grad-${fuel.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={fuel.color}
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="100%"
                    stopColor={fuel.color}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              interval="preserveStartEnd"
              minTickGap={20}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={50}
              tickFormatter={(v) => `${v}`}
            />

            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ strokeWidth: 1 }}
            />

            {fuelTypes.map((fuel) => (
              <Area
                key={fuel.key}
                type="monotone"
                dataKey={fuel.key}
                stroke={fuel.color}
                strokeWidth={2}
                fill={`url(#grad-${fuel.key})`}
                dot={false}
                activeDot={{
                  r: 3,
                  fill: fuel.color,
                  stroke: "hsl(var(--card))",
                  strokeWidth: 2,
                }}
                name={fuel.label}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </div>
    </section>
  );
};

export default YearlyChart;