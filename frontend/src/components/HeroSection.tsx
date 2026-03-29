import { useState, useEffect } from "react";
import { Fuel, Search, LocateFixed, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onSearch?: (city: string, lat?: number, lon?: number) => void;
  nationalDieselAvgPrice?: string;
}

const HeroSection = ({ onSearch, nationalDieselAvgPrice }: HeroSectionProps) => {
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

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
          transition={{ duration: 0.5 }}
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
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl lg:text-5xl font-extrabold leading-[1.1] mb-4 tracking-tight"
            >
              Prețurile carburanților,
              <br />
              <span className={isLightMode ? "text-gray-600" : "text-hero-foreground/80"}>la un click distanță.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`text-sm lg:text-base mb-6 max-w-md leading-relaxed ${isLightMode ? "text-gray-600" : "opacity-70"
                }`}>
              Urmărește evoluția prețurilor la benzină, motorină și GPL în timp real.
              Compară stațiile și găsește cel mai bun preț din zona ta.
            </motion.p>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
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
              transition={{ duration: 0.5, delay: 0.45 }}
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
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative w-64 h-64">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
                  <motion.circle cx="100" cy="100" r="85" stroke={isLightMode ? "hsl(217.2 91.2% 60%)" : "hsl(217.2 91.2% 50%)"} strokeWidth="1" opacity="0.4" animate={{ r: [85, 90, 85] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
                  <motion.circle cx="100" cy="100" r="70" stroke={isLightMode ? "hsl(217.2 91.2% 60%)" : "hsl(217.2 91.2% 50%)"} strokeWidth="0.5" opacity="0.35" animate={{ r: [70, 75, 70] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
                  <g transform="translate(60, 45)" opacity="0.95">
                    <rect x="10" y="30" width="50" height="70" rx="6" fill={isLightMode ? "hsl(210 40% 96%)" : "hsl(222.2 47.4% 25%)"} fillOpacity="0.9" stroke={isLightMode ? "hsl(217.2 91.2% 60%)" : "hsl(217.2 91.2% 50%)"} strokeWidth="1.5" strokeOpacity="0.8" />
                    <rect x="18" y="40" width="34" height="22" rx="3" fill={isLightMode ? "hsl(210 40% 100%)" : "hsl(222.2 47.4% 18%)"} fillOpacity="0.95" stroke={isLightMode ? "hsl(217.2 91.2% 60%)" : "hsl(217.2 91.2% 50%)"} strokeWidth="1" strokeOpacity="0.7" />
                    <text x="35" y="55" textAnchor="middle" fill={isLightMode ? "hsl(217.2 91.2% 45%)" : "hsl(217.2 91.2% 60%)"} fontSize="9" fontWeight="bold" opacity="1">{nationalDieselAvgPrice}</text>
                    <rect x="60" y="35" width="15" height="4" rx="2" fill={isLightMode ? "hsl(217.2 91.2% 55%)" : "hsl(217.2 91.2% 50%)"} fillOpacity="0.7" />
                    <path d="M75 37 L85 25 L85 55 L78 55 L78 41 L75 41" stroke={isLightMode ? "hsl(217.2 91.2% 55%)" : "hsl(217.2 91.2% 50%)"} strokeWidth="1.5" strokeOpacity="0.75" fill="none" />
                    <motion.path d="M85 55 Q 90 70, 80 80 Q 70 90, 75 100" stroke={isLightMode ? "hsl(217.2 91.2% 55%)" : "hsl(217.2 91.2% 50%)"} strokeWidth="2" strokeOpacity="0.7" fill="none" strokeLinecap="round" animate={{ d: ["M85 55 Q 90 70, 80 80 Q 70 90, 75 100", "M85 55 Q 92 68, 82 78 Q 72 88, 77 100", "M85 55 Q 90 70, 80 80 Q 70 90, 75 100"] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
                    <motion.g animate={{ y: [0, 2, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
                      <rect x="71" y="98" width="10" height="6" rx="2" fill={isLightMode ? "hsl(217.2 91.2% 55%)" : "hsl(217.2 91.2% 50%)"} fillOpacity="0.75" />
                    </motion.g>
                    <motion.circle cx="76" cy="108" r="2" fill={isLightMode ? "hsl(217.2 91.2% 55%)" : "hsl(217.2 91.2% 50%)"} fillOpacity="0.8" animate={{ cy: [108, 118, 108], opacity: [0.8, 0, 0.8], r: [2, 1, 2] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                    <rect x="5" y="100" width="60" height="8" rx="4" fill={isLightMode ? "hsl(210 40% 90%)" : "hsl(222.2 47.4% 30%)"} fillOpacity="0.7" />
                  </g>
                  <motion.g 
                    animate={{ 
                      x: [0, 10, -5, 0],
                      y: [0, -8, -12, 0],
                      opacity: [0.9, 1, 0.95, 0.9] 
                    }} 
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <circle cx="40" cy="60" r="16" fill={isLightMode ? "hsl(155 60% 45%)" : "hsl(155 70% 40%)"} fillOpacity="0.7" />
                    <text x="40" y="63" textAnchor="middle" fill="hsl(0 0% 100%)" fontSize="7" fontWeight="700" opacity="1">GPL</text>
                  </motion.g>
                  <motion.g 
                    animate={{ 
                      x: [0, -8, 5, 0],
                      y: [0, -5, -10, 0],
                      opacity: [0.85, 1, 0.9, 0.85] 
                    }} 
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  >
                    <circle cx="160" cy="75" r="14" fill={isLightMode ? "hsl(40 85% 55%)" : "hsl(40 90% 50%)"} fillOpacity="0.7" />
                    <text x="160" y="78" textAnchor="middle" fill="hsl(0 0% 100%)" fontSize="6" fontWeight="700" opacity="1">E95</text>
                  </motion.g>
                  <motion.g 
                    animate={{ 
                      x: [0, 6, -8, 0],
                      y: [0, -6, -8, 0],
                      opacity: [0.88, 1, 0.92, 0.88] 
                    }} 
                    transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  >
                    <circle cx="155" cy="140" r="12" fill="hsl(25 90% 50%)" fillOpacity="1" />
                    <text x="155" y="143" textAnchor="middle" fill="hsl(0 0% 100%)" fontSize="6" fontWeight="700" opacity="1">E98</text>
                  </motion.g>
                </svg>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
