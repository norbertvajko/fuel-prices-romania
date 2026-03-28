import { Navigation, Fuel, TrendingDown, Clock, ShoppingBag, Wifi, CreditCard, UtensilsCrossed, ChevronDown, Phone, Mail, Droplet, Car, Smartphone, Ticket, Sparkles, Zap, ShoppingCart, Map, MapPinned } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { capitalizeFirst } from "../lib/utilts";
import { useState, forwardRef } from "react";
import type { Station } from "../types";
import StationMap from "./StationMap";

interface StationCardProps {
  station: Station;
  cheapestPrice: number;
  isMostCheapestDiesel: boolean;
  isMostCheapestBenzina: boolean;
  index: number;
}

const FUEL_COLORS: Record<string, string> = {
  "Motorină standard": "hsl(214, 80%, 40%)",
  "Motorină premium": "hsl(210, 70%, 45%)",
  "Benzină 95": "hsl(142, 72%, 37%)",
  "Benzină 98": "hsl(32, 95%, 44%)",
  "GPL": "hsl(280, 60%, 50%)",
  "Incarcare Electrica": "hsl(195, 80%, 40%)",
};

const getFuelColor = (fuel: string, hasPrice: boolean) =>
  hasPrice ? FUEL_COLORS[fuel] || "hsl(215,20%,65%)" : "hsl(215,20%,85%)";

const shortLabel = (fuel: string) => {
  if (fuel === "Motorină premium") return "Diesel+";
  if (fuel.includes("Motorină")) return "Diesel";
  if (fuel.includes("98")) return "B98";
  if (fuel.includes("95")) return "B95";
  if (fuel.includes("GPL")) return "GPL";
  if (fuel.includes("Incarcare")) return "Elec";
  return fuel.slice(0, 6);
};

const FUEL_ORDER = [
  "Motorină standard",
  "Motorină premium",
  "Benzină 95",
  "Benzină 98",
  "GPL",
  "Incarcare Electrica",
];

const SERVICE_ICONS: Record<string, typeof Wifi> = {
  "WI-FI": Wifi,
  "Magazin": ShoppingCart,
  "Plati facturi": CreditCard,
  "Plati facturi, reincarcare electronica": CreditCard,
  "Restaurant": UtensilsCrossed,
  "AdBlue": Droplet,
  "Peaj": Car,
  "Reincarcare electronica": Smartphone,
  "Vigneta": Ticket,
  "Spalatorie auto": Sparkles,
  "GPL ": Zap,
  "Bancomat": CreditCard,
};

const SERVICE_COLORS: Record<string, string> = {
  "WI-FI": "text-blue-500",
  "Magazin": "text-amber-500",
  "Plati facturi": "text-green-500",
  "Plati facturi, reincarcare electronica": "text-green-500",
  "Restaurant": "text-orange-500",
  "AdBlue": "text-sky-500",
  "Peaj": "text-red-500",
  "Reincarcare electronica": "text-emerald-500",
  "Vigneta": "text-purple-500",
  "Spalatorie auto": "text-cyan-500",
  "GPL ": "text-yellow-500",
  "Bancomat": "text-indigo-500",
};

const StationCard = forwardRef<HTMLDivElement, StationCardProps>(({
  station,
  cheapestPrice,
  isMostCheapestDiesel,
  isMostCheapestBenzina,
  index,
}, ref) => {
  const { name, network, networkLogo, prices, lat, lon, updatedate, address, services = [], contactDetails } = station;
  const stationPrices = FUEL_ORDER.map(fuelName => {
    const found = prices.find(p => p.fuel === fuelName);
    return { fuel: fuelName, price: found?.price ?? null };
  });

  const validStationPrices = stationPrices.filter(p => p.price !== null);

  const [expanded, setExpanded] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const chartData = validStationPrices.map(p => ({
    name: shortLabel(p.fuel),
    fullName: p.fuel,
    price: p.price ?? 0,
    color: getFuelColor(p.fuel, p.price !== null),
  }));

  const hasDetails = services?.length || contactDetails;

  const getContactInfo = (details: string) => {
    if (!details) return { phone: "", email: "" };
    const phoneMatch = details.match(/(?:tel[:\s]*)?(\+?40|0)[\d\s-]{8,12}/i);
    let phone = phoneMatch ? phoneMatch[0].replace(/^tel[:\s]*/i, "").trim() : "";
    phone = phone.replace(/\s+/g, " ").trim();
    const emailMatch = details.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "";
    return { phone, email };
  };

  const { phone, email } = getContactInfo(contactDetails || "");

  return (
    <div
      ref={ref}
      className="group relative rounded-2xl bg-card border border-border/50 overflow-hidden shadow-[0_1px_4px_0_hsl(var(--foreground)/0.03),0_6px_20px_0_hsl(var(--foreground)/0.04)] hover:shadow-[0_4px_12px_0_hsl(var(--foreground)/0.06),0_12px_36px_0_hsl(var(--foreground)/0.08)] transition-[box-shadow,transform]"
      style={{
        animationDelay: `${80 + index * 70}ms`,
      }}
    >

      {isMostCheapestDiesel && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(214,80%,50%)] via-[hsl(214,80%,40%)] to-[hsl(214,80%,30%)]" />
      )}
      {isMostCheapestBenzina && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(142,72%,50%)] via-[hsl(142,72%,40%)] to-[hsl(142,72%,30%)]" />
      )}
      {isMostCheapestDiesel && isMostCheapestBenzina && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(214,80%,50%)] via-[hsl(214,80%,40%)] via-[hsl(142,72%,40%)] to-[hsl(142,72%,50%)]" />
      )}


      <div className="p-4 sm:p-6 pb-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-foreground text-lg leading-snug tracking-tight">
                {name}
              </h3>
              <span 
                className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                {network}
              </span>
            </div>

            {address && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPinned className="h-3.5 w-3.5 shrink-0" />
                {capitalizeFirst(address)}
              </p>
            )}

            {updatedate && (
              <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                <Clock className="h-3 w-3 shrink-0" />
                Ultima actualizare: {updatedate}
              </p>
            )}

            {(isMostCheapestDiesel || isMostCheapestBenzina) && (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold pt-0.5">
                <TrendingDown
                  className="h-3.5 w-3.5"
                  style={{
                    color:
                      isMostCheapestDiesel && isMostCheapestBenzina
                        ? "hsl(180, 76%, 42%)"
                        : isMostCheapestDiesel
                          ? "hsl(214, 80%, 40%)"
                          : "hsl(142, 72%, 37%)",
                  }}
                />

                <span
                  className={
                    isMostCheapestDiesel && isMostCheapestBenzina
                      ? "bg-gradient-to-r from-[hsl(214,80%,40%)] to-[hsl(142,72%,37%)] bg-clip-text text-transparent"
                      : ""
                  }
                  style={
                    !isMostCheapestDiesel || !isMostCheapestBenzina
                      ? {
                        color: isMostCheapestDiesel
                          ? "hsl(214, 80%, 40%)"
                          : "hsl(142, 72%, 37%)",
                      }
                      : {}
                  }
                >
                  {isMostCheapestDiesel && isMostCheapestBenzina
                    ? "Cel mai mic preț la motorină și benzină din zonă"
                    : isMostCheapestDiesel
                      ? "Cel mai mic preț la motorină din zonă"
                      : "Cel mai mic preț la benzină din zonă"}
                </span>
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            {networkLogo ? (
              <img
                src={networkLogo}
                alt={network}
                className="h-11.5 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground tabular-nums">{cheapestPrice.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">
                  RON/L
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 -mx-1 h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barCategoryGap="20%">
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(215,16%,47%)" }} />
              <YAxis
                domain={[0, "dataMax + 0.5"]}
                axisLine={false}
                tickLine={false}
                tick={false}
                width={20}
              />
              <Tooltip
                cursor={{ fill: "hsl(210,40%,96%)", radius: 4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
                      <p className="font-medium text-foreground">{d.fullName}</p>
                      <p className="text-muted-foreground mt-0.5">
                        <span className="font-semibold text-foreground tabular-nums">
                          {d.price > 0 ? d.price.toFixed(2) : "-"}
                        </span>{" "}
                        {d.fullName?.includes("Incarcare") || d.fullName?.includes("electric") ? "RON/kWh" : "RON/L"}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="price" radius={[6, 6, 2, 2]} maxBarSize={48}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={entry.price > 0 ? 0.85 : 0.3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fuel price pills */}
        <div className="mt-4 flex flex-wrap gap-2.5">
          {validStationPrices.map((p) => (
            <div
              key={p.fuel}
              className="inline-flex items-center gap-2 rounded-xl bg-muted/50 border border-border/40 px-3 py-2 text-sm"
            >
              <Fuel className="h-3.5 w-3.5 text-muted-foreground/70" />
              <span className="text-muted-foreground font-medium">{shortLabel(p.fuel)}</span>
              <span className="font-bold text-foreground tabular-nums">
                {p.price !== null ? p.price.toFixed(2) : "-"}
              </span>
            </div>
          ))}
        </div>

        {/* Services */}
        {services && services.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Servicii</p>
            <div className="flex flex-wrap gap-2">
              {services.map((s) => {
                const Icon = SERVICE_ICONS[s.name] || ShoppingBag;
                const iconColor = SERVICE_COLORS[s.name] || "text-muted-foreground";
                return (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent/60 border border-border/30 px-2.5 py-1.5 text-xs font-medium text-foreground/80"
                  >
                    <Icon className={`h-3 w-3 ${iconColor}`} />
                    {s.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact (expandable) */}
        {hasDetails && contactDetails && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-colors active:scale-[0.97]"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              Detalii contact
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && (
              <div className="mt-2.5 pl-1 text-sm text-muted-foreground whitespace-pre-wrap">
                {contactDetails}
              </div>
            )}
          </div>
        )}

        {/* Inline Map */}
        {showMap && lat && lon && (
          <div className="mt-3 mb-3 animate-in slide-in-from-top-2 fade-in duration-300">
            <StationMap lat={lat} lon={lon} name={name} network={network} />
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-muted/30">
        <button
          onClick={() => setShowMap(!showMap)}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${showMap ? "" : "opacity-70 hover:opacity-100"}`}
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <Map className="w-4 h-4" />
          Hartă
        </button>
        <a 
          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-1.5 text-sm font-medium opacity-70 hover:opacity-100 transition-colors"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          <Navigation className="w-4 h-4" />
          Navigare
        </a>
        {phone && (
          <a 
            href={`tel:${phone}`} 
            className="flex items-center gap-1.5 text-sm font-medium opacity-70 hover:opacity-100 transition-colors"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            <Phone className="w-4 h-4" />
            Sună
          </a>
        )}
        {email && (
          <a 
            href={`mailto:${email}`} 
            className="flex items-center gap-1.5 text-sm font-medium opacity-70 hover:opacity-100 transition-colors"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            <Mail className="w-4 h-4" />
            Email
          </a>
        )}
      </div>
    </div>
  );
});

StationCard.displayName = "StationCard";

export default StationCard;
