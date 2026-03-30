import { useState, useEffect, useMemo } from "react";
import { Fuel, Search, LocateFixed, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import FuelIllustration from "./FuelIlustration";

interface HeroSectionProps {
  onSearch?: (city: string, lat?: number, lon?: number) => void;
  nationalDieselAvgPrice?: string;
  nationalFuelLabel?: string;
}

// Cache key for localStorage
const FUEL_DATA_CACHE_KEY = "fuel_data_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedFuelData {
  price: string;
  label: string;
  timestamp: number;
}

const HeroSection = ({ onSearch, nationalDieselAvgPrice, nationalFuelLabel }: HeroSectionProps) => {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  // Memoize the date to prevent recalculation on every render
  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }, []);

  // Cache and retrieve fuel data with localStorage
  const [cachedPrice, setCachedPrice] = useState<string>("");
  const [cachedLabel, setCachedLabel] = useState<string>("");

  useEffect(() => {
    // Try to load from cache first
    try {
      const cached = localStorage.getItem(FUEL_DATA_CACHE_KEY);
      if (cached) {
        const parsed: CachedFuelData = JSON.parse(cached);
        const now = Date.now();
        if (now - parsed.timestamp < CACHE_DURATION) {
          setCachedPrice(parsed.price);
          setCachedLabel(parsed.label);
        }
      }
    } catch {
      // Ignore cache errors
    }
  }, []);

  // Update cache when new data arrives
  useEffect(() => {
    if (nationalDieselAvgPrice && nationalFuelLabel) {
      setCachedPrice(nationalDieselAvgPrice);
      setCachedLabel(nationalFuelLabel);
      
      try {
        localStorage.setItem(FUEL_DATA_CACHE_KEY, JSON.stringify({
          price: nationalDieselAvgPrice,
          label: nationalFuelLabel,
          timestamp: Date.now()
        }));
      } catch {
        // Ignore storage errors
      }
    }
  }, [nationalDieselAvgPrice, nationalFuelLabel]);

  // Use cached values if props are not available
  const displayPrice = nationalDieselAvgPrice || cachedPrice || "—";
  const displayLabel = nationalFuelLabel || cachedLabel || "Motorină";

  useEffect(() => {
    const checkTheme = () => {
      setIsLightMode(document.documentElement.classList.contains("light"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query.trim());
      setQuery("");
    }
  };

  const handleLocateMe = async () => {
    if (!navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ro`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.municipality ||
            "";
          if (city) {
            onSearch?.(city, latitude, longitude);
          }
        } catch {
          // silently fail
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Color helpers
  const getStrokeColor = () => 
    isLightMode ? "hsl(217.2 91.2% 60%)" : "hsl(217.2 91.2% 50%)";

  const getFillColor = () => 
    isLightMode ? "hsl(210 40% 96%)" : "hsl(222.2 47.4% 25%)";

  const getTextColor = () => 
    isLightMode ? "hsl(217.2 91.2% 45%)" : "hsl(217.2 91.2% 60%)";

  return (
    <div className={`overflow-hidden px-6 pt-10 pb-44 lg:pt-14 lg:pb-32 `}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl ${isLightMode ? "bg-blue-500 opacity-5" : "bg-hero-glow opacity-10"
          }`} />
        <div className={`absolute bottom-0 -left-20 w-72 h-72 rounded-full blur-3xl ${isLightMode ? "bg-blue-500 opacity-3" : "bg-hero-glow opacity-[0.07]"
          }`} />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-2.5 mb-8"
        >
          <div className={`w-9 h-9 backdrop-blur-sm rounded-xl flex items-center justify-center border ${isLightMode
              ? "bg-gray-100 border-gray-200"
              : "bg-hero-foreground/15 border-hero-foreground/10"
            }`}>
            <Fuel className="w-4 h-4" />
          </div>
          <span className={`text-xs font-semibold tracking-[0.2em] uppercase ${isLightMode ? "text-gray-600" : "opacity-80"
            }`}>
            Monitor Prețuri Combustibil
          </span>
        </motion.div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* Left: Title + Search */}
          <div className="lg:max-w-xl">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="text-4xl lg:text-5xl font-extrabold leading-[1.1] mb-4 tracking-tight"
            >
              Prețurile carburanților,
              <br />
              <span className={isLightMode ? "text-gray-600" : "text-hero-foreground/80"}>la un click distanță.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className={`text-sm lg:text-base mb-6 max-w-md leading-relaxed ${isLightMode ? "text-gray-600" : "opacity-70"
                }`}>
              Urmărește evoluția prețurilor la benzină, motorină și GPL în timp real.
              Compară stațiile și găsește cel mai bun preț din zona ta.
            </motion.p>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              className={`flex items-center backdrop-blur-md rounded-2xl p-1.5 max-w-md shadow-lg ${isLightMode
                  ? "bg-gray-50 border border-gray-200 shadow-gray-200/50"
                  : "bg-hero-foreground/10 border border-hero-foreground/15 shadow-black/10"
                }`}>
              <Search className={`w-4 h-4 ml-3 ${isLightMode ? "text-gray-400" : "opacity-50"}`} />
              <input
                type="text"
                placeholder="Caută un oraș (ex: Arad, București)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit(e)}
                className={`flex-1 bg-transparent outline-none px-3 py-2.5 text-sm ${isLightMode ? "placeholder:text-gray-400" : "placeholder:text-hero-foreground/40"
                  }`}
              />
              <button
                onClick={handleSubmit}
                className="font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 shadow-md cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90">
                Caută
              </button>
            </motion.div>

            {/* Location button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
              onClick={handleLocateMe}
              disabled={locating}
              className={`mt-3 flex items-center gap-2 text-xs font-medium transition-colors cursor-pointer group disabled:opacity-50 ${isLightMode
                  ? "text-gray-500 hover:text-gray-700"
                  : "text-hero-foreground/70 hover:text-hero-foreground"
                }`}>
              {locating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className={`w-3.5 h-3.5 transition-colors ${isLightMode ? "group-hover:text-blue-500" : "group-hover:text-hero-glow"
                  }`} />
              )}
              {locating ? "Se detectează locația..." : "Folosește locația mea curentă"}
            </motion.button>
          </div>

          {/* Right: Animated fuel illustration */}
          <FuelIllustration isLightMode={isLightMode} displayLabel={displayLabel} displayPrice={displayPrice} currentDate={currentDate} />
        </div>
      </div>

    </div>
  );
};

export default HeroSection;
