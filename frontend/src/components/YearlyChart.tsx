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

// Transform API data to chart format
const transformData = (history: Array<{ date: string; fuel_type: string; price: number }>) => {
  const grouped: Record<string, Record<string, number>> = {};
  
  history.forEach((item) => {
    if (!grouped[item.date]) {
      grouped[item.date] = {};
    }
    // Map database key to mockFuelData key
    const mappedKey = fuelTypeMapping[item.fuel_type] || item.fuel_type;
    grouped[item.date][mappedKey] = item.price;
  });

  // Sort by date to ensure proper chronological order
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return sortedDates.map((date) => ({
    date: new Date(date).toLocaleDateString("ro-RO", { month: "short", day: "numeric" }),
    motorina: grouped[date].motorina,
    motorina_plus: grouped[date].motorina_plus,
    benzina95: grouped[date].benzina95,
    benzina98: grouped[date].benzina98,
    gpl: grouped[date].gpl,
  }));
};

const YearlyChart = () => {
  const [data, setData] = useState<ReturnType<typeof transformData>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/price-history/national?days=365`);
        const result = await response.json();
        setData(transformData(result.history || []));
      } catch (err) {
        console.error("Failed to fetch:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                  <div className="h-3 w-12 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-[350px] sm:h-[420px] w-full bg-muted/30 rounded-lg animate-pulse" />
        </div>
      </section>
    );
  }

  // Handle case with no data
  if (data.length === 0) {
    return (
      <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-card-foreground">
                  Evoluția prețurilor
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Graficul prețurilor medii din Romania
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4">
              {fuelTypes.map((fuel) => (
                <div key={fuel.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: fuel.color }}
                  />
                  <span className="font-medium">{fuel.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-[350px] sm:h-[420px] w-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Nu există date istorice disponibile</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-card-foreground">
                Evoluția prețurilor
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Graficul prețurilor medii din Romania
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4">
            {fuelTypes.map((fuel) => (
              <div key={fuel.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: fuel.color }}
                />
                <span className="font-medium">{fuel.label}</span>
              </div>
            ))}
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[350px] sm:h-[420px] w-full">
          <AreaChart 
            data={data} 
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              {fuelTypes.map((fuel) => (
                <linearGradient key={fuel.key} id={`grad-${fuel.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={fuel.color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={fuel.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              horizontal
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              interval={data.length <= 4 ? 0 : 4}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              domain={["auto", "auto"]}
              tickFormatter={(v) => `${v} lei`}
              width={60}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {fuelTypes.map((fuel) => (
              <Area
                key={fuel.key}
                type="linear"
                dataKey={fuel.key}
                stroke={fuel.color}
                strokeWidth={2}
                fill={`url(#grad-${fuel.key})`}
                dot={true}
                activeDot={{
                  r: 4,
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