import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { fuelTypes } from "../data/mockFuelData";
import { Maximize2, Minimize2, TrendingUp } from "lucide-react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { API_URL } from "../constants";

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

type RawEntry = { date: string; fuel_type: string; price: number };

const TIME_RANGES = [
  { key: "1W", label: "1S", days: 7 },
  { key: "1M", label: "1L", days: 30 },
  { key: "3M", label: "3L", days: 30 * 3 },
  { key: "1Y", label: "1A", days: 365 },
  { key: "5Y", label: "5A", days: 365 * 5 },
  { key: "10Y", label: "10A", days: 365 * 10 },
  { key: "ALL", label: "Tot", days: 0 },
] as const;

type RangeKey = (typeof TIME_RANGES)[number]["key"];

const transformData = (history: RawEntry[]) => {
  const grouped: Record<string, Record<string, number>> = {};

  history.forEach((item) => {
    if (!grouped[item.date]) grouped[item.date] = {};
    const mappedKey = fuelTypeMapping[item.fuel_type] || item.fuel_type;
    grouped[item.date][mappedKey] = item.price;
  });

  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return sortedDates.map((date) => ({
    rawDate: date,
    date: new Date(date).toLocaleDateString("ro-RO", {
      month: "short",
      day: "numeric",
      year: sortedDates.length > 365 ? "2-digit" : undefined,
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
  const [rawData, setRawData] = useState<RawEntry[]>([]);
  const [activeRange, setActiveRange] = useState<RangeKey>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const startTime = Date.now();
      const estimatedDuration = 2000;

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / estimatedDuration) * 90, 90);
        onProgress?.(progress);
      }, 50);

      try {
        // Fetch all available history (from 2016)
        const response = await fetch(
          `${API_URL}/price-history/national?days=all`
        );
        const result = await response.json();
        setRawData(result.history || []);
        onProgress?.(100);
      } catch (err) {
        onProgress?.(100);
      } finally {
        setLoading(false);
        clearInterval(progressInterval);
        onLoadingComplete?.();
      }
    };

    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (rawData.length === 0) return [];

    const range = TIME_RANGES.find((r) => r.key === activeRange);
    if (!range || range.days === 0) return transformData(rawData);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range.days);

    const filtered = rawData.filter(
      (item) => new Date(item.date) >= cutoff
    );
    return transformData(filtered);
  }, [rawData, activeRange]);

  const handleRangeChange = useCallback((key: RangeKey) => {
    setActiveRange(key);
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && chartContainerRef.current) {
      chartContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
    } else if (document.fullscreenElement) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const renderHeader = () => (
    <div className="flex flex-col gap-3 sm:gap-4 mb-2 sm:mb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
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

        <div className="flex flex-wrap gap-2 sm:gap-4 pb-1 sm:pb-0">
          {fuelTypes.map((fuel) => (
            <div
              key={fuel.key}
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs"
            >
              <div
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: fuel.color }}
              />
              <span className="font-medium">{fuel.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Time range filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 w-fit">
          {TIME_RANGES.map((range) => (
            <button
              key={range.key}
              onClick={() => handleRangeChange(range.key)}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all duration-200 ${activeRange === range.key
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {range.label}
            </button>
          ))}
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title={isFullscreen ? "Ieși din ecran complet" : "Ecran complet"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  if (loading || filteredData.length === 0) {
    return (
      <section ref={chartContainerRef} className="mx-auto px-3 sm:px-4 -mt-10 sm:-mt-12 relative z-10 max-w-[950px]">
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-lg">
          {renderHeader()}
          <div className="h-[280px] sm:h-[350px] flex items-center justify-center">
            <p className="text-muted-foreground text-xs sm:text-sm text-center">
              {loading
                ? "Se încarcă datele..."
                : "Nu există date istorice disponibile"}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={chartContainerRef} className="mx-auto px-4 sm:px-6 -mt-10 sm:-mt-12 relative z-10 max-w-[950px]">
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-lg">
        {renderHeader()}

        <ChartContainer
          config={chartConfig}
          className={`w-full overflow-visible ${isFullscreen ? "flex-1" : "h-[280px] sm:h-[350px]"}`}
        >
          <AreaChart
            data={filteredData}
            margin={{ top: 10, right: 5, left: -10, bottom: 0 }}
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
              tick={{
                fontSize: 9,
                fill: "hsl(var(--muted-foreground))",
              }}
              interval="preserveStartEnd"
              minTickGap={15}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{
                fontSize: 9,
                fill: "hsl(var(--muted-foreground))",
              }}
              width={40}
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