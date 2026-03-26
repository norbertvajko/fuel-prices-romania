import { useState } from "react";
import { Fuel, Search } from "lucide-react";
import { motion } from "framer-motion";


interface HeroSectionProps {
  onSearch?: (city: string) => void;
}

const HeroSection = ({ onSearch }: HeroSectionProps) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query.trim());
      setQuery("");
    }
  };

  return (
    <div className="relative overflow-hidden bg-linear-to-br from-hero-bg via-hero-bg to-hero-bg-dark text-hero-foreground px-6 pt-10 pb-44 lg:pt-14 lg:pb-32">      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[hsl(var(--hero-glow))] opacity-10 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-[hsl(var(--hero-glow))] opacity-[0.07] blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5 mb-8"
        >
          <div className="w-9 h-9 bg-hero-foreground/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-hero-foreground/10">
            <Fuel className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase opacity-80">
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
              <span className="text-hero-foreground/80">la un click distanță.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm lg:text-base opacity-70 mb-6 max-w-md leading-relaxed"
            >
              Urmărește evoluția prețurilor la benzină, motorină și GPL în timp real.
              Compară stațiile și găsește cel mai bun preț din zona ta.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex items-center bg-hero-foreground/10 backdrop-blur-md rounded-2xl p-1.5 max-w-md border-hero-foreground/15 shadow-lg shadow-black/10"
            >
              <Search className="w-4 h-4 ml-3 opacity-50" />
              <input
                type="text"
                placeholder="Caută un oraș (ex: Arad, București)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="flex-1 bg-transparent outline-none px-3 py-2.5 text-sm placeholder:text-hero-foreground/40"
              />
              <button 
                onClick={handleSubmit}
                className="bg-hero-foreground text-hero-bg font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-hero-foreground/90 transition-all duration-200 shadow-md cursor-pointer"
              >
                Caută
              </button>
            </motion.div>
          </div>

          {/* Right: Animated fuel illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative w-64 h-64">
              {/* Pump body */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <svg viewBox="0 0 200 200" className="w-full h-full" fill="none">
                  {/* Glow ring */}
                  <motion.circle
                    cx="100" cy="100" r="85"
                    stroke="currentColor"
                    strokeWidth="1"
                    opacity="0.1"
                    animate={{ r: [85, 90, 85] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.circle
                    cx="100" cy="100" r="70"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.08"
                    animate={{ r: [70, 75, 70] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />

                  {/* Fuel pump icon */}
                  <g transform="translate(60, 45)" opacity="0.9">
                    {/* Pump body */}
                    <rect x="10" y="30" width="50" height="70" rx="6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
                    {/* Screen */}
                    <rect x="18" y="40" width="34" height="22" rx="3" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1" strokeOpacity="0.25" />
                    {/* Price display */}
                    <text x="35" y="55" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="bold" opacity="0.7">9.85</text>
                    {/* Nozzle */}
                    <rect x="60" y="35" width="15" height="4" rx="2" fill="currentColor" fillOpacity="0.2" />
                    <path d="M75 37 L85 25 L85 55 L78 55 L78 41 L75 41" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" fill="none" />
                    {/* Hose */}
                    <motion.path
                      d="M85 55 Q 90 70, 80 80 Q 70 90, 75 100"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeOpacity="0.2"
                      fill="none"
                      strokeLinecap="round"
                      animate={{ d: ["M85 55 Q 90 70, 80 80 Q 70 90, 75 100", "M85 55 Q 92 68, 82 78 Q 72 88, 77 100", "M85 55 Q 90 70, 80 80 Q 70 90, 75 100"] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {/* Nozzle tip */}
                    <motion.g
                      animate={{ y: [0, 2, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <rect x="71" y="98" width="10" height="6" rx="2" fill="currentColor" fillOpacity="0.25" />
                    </motion.g>
                    {/* Drip animation */}
                    <motion.circle
                      cx="76" cy="108"
                      r="2"
                      fill="currentColor"
                      fillOpacity="0.3"
                      animate={{ cy: [108, 118, 108], opacity: [0.3, 0, 0.3], r: [2, 1, 2] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {/* Base */}
                    <rect x="5" y="100" width="60" height="8" rx="4" fill="currentColor" fillOpacity="0.12" />
                  </g>

                  {/* Floating price bubbles */}
                  <motion.g
                    animate={{ y: [0, -8, 0], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <circle cx="40" cy="60" r="16" fill="currentColor" fillOpacity="0.08" />
                    <text x="40" y="63" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="600" opacity="0.5">GPL</text>
                  </motion.g>

                  <motion.g
                    animate={{ y: [0, -5, 0], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  >
                    <circle cx="160" cy="75" r="14" fill="currentColor" fillOpacity="0.08" />
                    <text x="160" y="78" textAnchor="middle" fill="currentColor" fontSize="6" fontWeight="600" opacity="0.5">E95</text>
                  </motion.g>

                  <motion.g
                    animate={{ y: [0, -6, 0], opacity: [0.35, 0.55, 0.35] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  >
                    <circle cx="155" cy="140" r="12" fill="currentColor" fillOpacity="0.08" />
                    <text x="155" y="143" textAnchor="middle" fill="currentColor" fontSize="6" fontWeight="600" opacity="0.5">E98</text>
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