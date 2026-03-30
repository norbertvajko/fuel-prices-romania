import { useState, useEffect, useMemo } from "react";
import { Fuel, Search, LocateFixed, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

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
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 flex items-center justify-center animate-float">
                <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
                  {/* Outer pulsing circle */}
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="85" 
                    stroke={getStrokeColor()} 
                    strokeWidth="1" 
                    opacity="0.4" 
                    className="animate-pulse-slow"
                  />
                  
                  {/* Inner pulsing circle */}
                  <circle 
                    cx="100" 
                    cy="100" 
                    r="70" 
                    stroke={getStrokeColor()} 
                    strokeWidth="0.5" 
                    opacity="0.35" 
                    className="animate-pulse-slower"
                  />

                  {/* Glow effect behind the card */}
                  <circle
                    cx="85"
                    cy="80"
                    r="30"
                    fill={getStrokeColor()}
                    fillOpacity="0.1"
                    className="animate-pulse-slow"
                  />
                  
                  {/* Main fuel card */}
                  <g transform="translate(60, 45)" opacity="0.95">
                    {/* Card background */}
                    <rect 
                      x="10" 
                      y="30" 
                      width="50" 
                      height="70" 
                      rx="6" 
                      fill={getFillColor()} 
                      fillOpacity="0.9" 
                      stroke={getStrokeColor()} 
                      strokeWidth="1.5" 
                      strokeOpacity="0.8" 
                    />
                    
                    {/* Price display area */}
                    <rect 
                      x="18" 
                      y="40" 
                      width="34" 
                      height="22" 
                      rx="3" 
                      fill={isLightMode ? "hsl(210 40% 100%)" : "hsl(222.2 47.4% 18%)"} 
                      fillOpacity="0.95" 
                      stroke={getStrokeColor()} 
                      strokeWidth="1" 
                      strokeOpacity="0.7" 
                    />
                    
                    {/* Price text */}
                    <text 
                      x="35" 
                      y="55" 
                      textAnchor="middle" 
                      fill={getTextColor()} 
                      fontSize="9" 
                      fontWeight="bold" 
                      opacity="1"
                    >
                      {displayPrice}
                    </text>
                    
                    {/* Fuel label */}
                    <text 
                      x="35" 
                      y="75" 
                      textAnchor="middle" 
                      fill={getTextColor()} 
                      fontSize="6" 
                      fontWeight="500" 
                      opacity="1"
                    >
                      {displayLabel}
                    </text>
                    
                    {/* Date */}
                    <text 
                      x="35" 
                      y="95" 
                      textAnchor="middle" 
                      fill={getTextColor()} 
                      fontSize="5" 
                      fontWeight="500" 
                      opacity="1"
                    >
                      {currentDate}
                    </text>
                    
                    {/* Decorative elements */}
                    <rect 
                      x="60" 
                      y="35" 
                      width="15" 
                      height="4" 
                      rx="2" 
                      fill={getStrokeColor()} 
                      fillOpacity="0.7" 
                    />
                    
                    <path 
                      d="M75 37 L85 25 L85 55 L78 55 L78 41 L75 41" 
                      stroke={getStrokeColor()} 
                      strokeWidth="1.5" 
                      strokeOpacity="0.75" 
                      fill="none" 
                    />
                    
                    {/* Animated fuel stream */}
                    <path 
                      d="M85 55 Q 90 70, 80 80 Q 70 90, 75 100" 
                      stroke={getStrokeColor()} 
                      strokeWidth="2" 
                      strokeOpacity="0.7" 
                      fill="none" 
                      strokeLinecap="round" 
                      className="animate-wave"
                    />
                    
                    {/* Animated fuel drop */}
                    <g className="animate-bounce-slow">
                      <rect 
                        x="71" 
                        y="98" 
                        width="10" 
                        height="6" 
                        rx="2" 
                        fill={getStrokeColor()} 
                        fillOpacity="0.75" 
                      />
                    </g>
                    
                    {/* Animated dripping drop */}
                    <circle 
                      cx="76" 
                      cy="108" 
                      r="2" 
                      fill={getStrokeColor()} 
                      fillOpacity="0.8" 
                      className="animate-drip"
                    />
                    
                    {/* Base platform */}
                    <rect 
                      x="5" 
                      y="100" 
                      width="60" 
                      height="8" 
                      rx="4" 
                      fill={isLightMode ? "hsl(210 40% 90%)" : "hsl(222.2 47.4% 30%)"} 
                      fillOpacity="0.7" 
                    />
                  </g>
                  
                  {/* GPL bubble */}
                  <g className="animate-float-gpl">
                    <circle 
                      cx="40" 
                      cy="60" 
                      r="16" 
                      fill={isLightMode ? "hsl(155 60% 45%)" : "hsl(155 70% 40%)"} 
                      fillOpacity="0.7"
                    />
                    <text 
                      x="40" 
                      y="63" 
                      textAnchor="middle" 
                      fill="hsl(0 0% 100%)" 
                      fontSize="7" 
                      fontWeight="700" 
                      opacity="1"
                    >
                      GPL
                    </text>
                  </g>
                  
                  {/* E95 bubble */}
                  <g className="animate-float-e95">
                    <circle 
                      cx="160" 
                      cy="75" 
                      r="14" 
                      fill={isLightMode ? "hsl(40 85% 55%)" : "hsl(40 90% 50%)"} 
                      fillOpacity="0.7"
                    />
                    <text 
                      x="160" 
                      y="78" 
                      textAnchor="middle" 
                      fill="hsl(0 0% 100%)" 
                      fontSize="6" 
                      fontWeight="700" 
                      opacity="1"
                    >
                      E95
                    </text>
                  </g>
                  
                  {/* E98 bubble */}
                  <g className="animate-float-e98">
                    <circle 
                      cx="155" 
                      cy="140" 
                      r="12" 
                      fill="hsl(25 90% 50%)" 
                      fillOpacity="1"
                    />
                    <text 
                      x="155" 
                      y="143" 
                      textAnchor="middle" 
                      fill="hsl(0 0% 100%)" 
                      fontSize="6" 
                      fontWeight="700" 
                      opacity="1"
                    >
                      E98
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; r: 85; }
          50% { opacity: 0.6; r: 90; }
        }
        
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.35; r: 70; }
          50% { opacity: 0.5; r: 75; }
        }
        
        @keyframes float-gpl {
          0%, 100% { transform: translate(0, 0); opacity: 0.9; }
          33% { transform: translate(10px, -8px); opacity: 1; }
          66% { transform: translate(-5px, -12px); opacity: 0.95; }
        }
        
        @keyframes float-e95 {
          0%, 100% { transform: translate(0, 0); opacity: 0.85; }
          33% { transform: translate(-8px, -5px); opacity: 1; }
          66% { transform: translate(5px, -10px); opacity: 0.9; }
        }
        
        @keyframes float-e98 {
          0%, 100% { transform: translate(0, 0); opacity: 0.88; }
          33% { transform: translate(6px, -6px); opacity: 1; }
          66% { transform: translate(-8px, -8px); opacity: 0.92; }
        }
        
        @keyframes wave {
          0%, 100% { d: path("M85 55 Q 90 70, 80 80 Q 70 90, 75 100"); }
          50% { d: path("M85 55 Q 92 68, 82 78 Q 72 88, 77 100"); }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
        
        @keyframes drip {
          0% { cy: 108; opacity: 0.8; r: 2; }
          50% { cy: 118; opacity: 0; r: 1; }
          100% { cy: 108; opacity: 0.8; r: 2; }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        
        .animate-pulse-slower {
          animation: pulse-slower 4s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        
        .animate-float-gpl {
          animation: float-gpl 6s ease-in-out infinite;
        }
        
        .animate-float-e95 {
          animation: float-e95 5s ease-in-out infinite;
          animation-delay: 1s;
        }
        
        .animate-float-e98 {
          animation: float-e98 5.5s ease-in-out infinite;
          animation-delay: 2s;
        }
        
        .animate-wave {
          animation: wave 4s ease-in-out infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        
        .animate-drip {
          animation: drip 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default HeroSection;
