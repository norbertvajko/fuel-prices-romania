import { useState, useRef, useEffect } from "react";
import { Fuel, TrendingDown, BarChart3, Search, MapPin } from "lucide-react";

interface HeroSectionProps {
  onSearch?: (city: string) => void;
}

const cities = [
  "Arad", "București", "Cluj-Napoca", "Timișoara", "Iași", "Constanța",
  "Brașov", "Craiova", "Galați", "Oradea", "Sibiu", "Ploiești",
  "Bacău", "Pitești", "Baia Mare", "Buzău", "Suceava", "Târgu Mureș",
  "Alba Iulia", "Bistrița", "Deva", "Hunedoara", "Mediaș", "Satu Mare",
];

const HeroSection = ({ onSearch }: HeroSectionProps) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("Arad");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? cities.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : cities;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (city: string) => {
    setSelectedCity(city);
    setQuery("");
    setOpen(false);
    onSearch?.(city);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Use the typed city name directly
      onSearch?.(query.trim());
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-primary">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center">
            <Fuel className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-primary-foreground/70 text-sm font-medium tracking-wide uppercase">
            Monitor Prețuri Combustibil
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight max-w-3xl">
          Prețurile carburanților,
          <br />
          <span className="text-primary-foreground/80">la un click distanță.</span>
        </h1>

        <p className="mt-6 text-lg text-primary-foreground/60 max-w-xl leading-relaxed">
          Urmărește evoluția prețurilor la benzină, motorină și GPL în timp real.
          Compară stațiile și găsește cel mai bun preț din zona ta.
        </p>

        {/* Search bar */}
        <div ref={wrapperRef} className="relative mt-8 max-w-lg">
          <form onSubmit={handleSubmit} className="flex items-center bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 rounded-2xl px-4 py-3 gap-3 focus-within:border-primary-foreground/40 transition-colors">
            <Search className="w-5 h-5 text-primary-foreground/50 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Caută un oraș (ex: Arad, București)"
              className="flex-1 bg-transparent text-primary-foreground placeholder:text-primary-foreground/40 text-sm outline-none"
            />
            <button
              type="submit"
              className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
            >
              Caută
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;