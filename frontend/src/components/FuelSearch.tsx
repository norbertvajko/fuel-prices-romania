import { useState, useRef, useEffect } from "react";
import { Search, MapPin, Navigation, Fuel, X, ChevronDown, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import type { FuelType, PriceSort, SearchMode } from "../types";
import { FUEL_OPTIONS, SORT_OPTIONS, DEFAULT_SORT, ALL_FUELS } from "../constants";

interface FuelSearchProps {
  onSearchCity: (city: string, fuels: FuelType[], sort: PriceSort) => void;
  onSearchAddress: (address: string, fuels: FuelType[], sort: PriceSort) => void;
  onSearchNearby: (fuels: FuelType[], sort: PriceSort) => void;
  onClearSearch: () => void;
  isLoading: boolean;
  hasSearched: boolean;
}

const FuelSearch = ({ onSearchCity, onSearchAddress, onSearchNearby, onClearSearch, isLoading, hasSearched }: FuelSearchProps) => {
  const [mode, setMode] = useState<SearchMode>("city");
  const [query, setQuery] = useState("");
  const [selectedFuels, setSelectedFuels] = useState<Set<FuelType>>(new Set(ALL_FUELS));
  const [selectedSort, setSelectedSort] = useState<PriceSort>(DEFAULT_SORT);
  const [isFocused, setIsFocused] = useState(false);
  const [showFuelDropdown, setShowFuelDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const fuelDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fuelDropdownRef.current && !fuelDropdownRef.current.contains(event.target as Node)) {
        setShowFuelDropdown(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFuel = (fuel: FuelType) => {
    setSelectedFuels((prev) => {
      const next = new Set(prev);
      if (next.has(fuel)) {
        if (next.size > 1) next.delete(fuel);
      } else {
        next.add(fuel);
      }
      return next;
    });
  };

  const getFuelArray = (): FuelType[] => {
    return Array.from(selectedFuels);
  };

  const handleSearch = () => {
    if (!query.trim() || isLoading) return;
    const fuels = getFuelArray();
    if (mode === "city") {
      onSearchCity(query.trim(), fuels, selectedSort);
    } else {
      onSearchAddress(query.trim(), fuels, selectedSort);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleNearbyClick = () => {
    if (isLoading) return;
    onSearchNearby(getFuelArray(), selectedSort);
  };

  const handleClear = () => {
    setQuery("");
    onClearSearch();
  };

  const isSearchDisabled = isLoading || !query.trim();

  // Compact navbar mode after search
  if (hasSearched) {
    return (
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
          {/* Mobile Layout: Two rows */}
          <div className="sm:hidden py-2 space-y-2">
            {/* Row 1: Logo + Search + Search Button */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Fuel className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "city" ? "Caută oraș sau adresă..." : "Caută adresă..."}
                  disabled={isLoading}
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/60 border border-transparent text-foreground placeholder:text-muted-foreground/60 text-sm outline-none focus:bg-card focus:border-primary/25 disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearchDisabled}
                className="h-10 px-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                Caută
              </button>
            </div>
            {/* Row 2: Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filter */}
              <div className="relative" ref={fuelDropdownRef}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowFuelDropdown(!showFuelDropdown); }}
                  className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs text-muted-foreground border hover:bg-muted"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filtre
                </button>
                {showFuelDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-card border rounded-lg shadow-lg p-2 z-50">
                    {FUEL_OPTIONS.map(({ id, label, icon: Icon, color, activeBg }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleFuel(id)}
                        className={`flex items-center gap-1.5 text-sm text-muted-foreground border rounded-lg px-3 py-1.5 hover:bg-muted w-full ${selectedFuels.has(id) ? activeBg : ""}`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${selectedFuels.has(id) ? color : ""}`} />
                        {label}
                        {selectedFuels.has(id) && (
                          <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Sort */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSortDropdown(!showSortDropdown); }}
                  className="h-9 px-3 flex items-center gap-1 text-xs text-muted-foreground border rounded-lg hover:bg-muted"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sortare
                </button>
                {showSortDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-card border rounded-lg shadow-lg p-2 z-50">
                    {SORT_OPTIONS.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setSelectedSort(id); setShowSortDropdown(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${selectedSort === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                      >
                        {label}
                        {selectedSort === id && (
                          <svg className="w-4 h-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Nearby */}
              <button
                type="button"
                onClick={handleNearbyClick}
                disabled={isLoading}
                className="h-9 px-3 flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg hover:bg-muted"
              >
                <Navigation className="w-4 h-4" />
                Aproape
              </button>
              {/* Clear */}
              <button
                type="button"
                onClick={handleClear}
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop Layout: Single row */}
          <div className="hidden sm:flex items-center gap-4 h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Fuel className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>

            {/* Search Input */}
            <div className="flex-1 flex items-center gap-3">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "city" ? "Caută oraș sau adresă..." : "Caută adresă..."}
                  disabled={isLoading}
                  className="w-full h-11 pl-10 pr-4 rounded-lg bg-muted/60 border border-transparent text-foreground placeholder:text-muted-foreground/60 text-sm outline-none focus:bg-card focus:border-primary/25 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Desktop Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Filter */}
              <div className="relative" ref={fuelDropdownRef}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowFuelDropdown(!showFuelDropdown); }}
                  className="h-11 px-3 rounded-lg flex items-center gap-1.5 text-sm text-muted-foreground border py-1.5 hover:bg-muted"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filtre
                </button>
                {showFuelDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg p-2 z-50">
                    {FUEL_OPTIONS.map(({ id, label, icon: Icon, color, activeBg }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleFuel(id)}
                        className={`flex items-center gap-1.5 text-sm text-muted-foreground border rounded-lg px-3 py-1.5 hover:bg-muted w-full ${selectedFuels.has(id) ? activeBg : ""}`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${selectedFuels.has(id) ? color : ""}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort */}
              <div className="relative" ref={sortDropdownRef}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSortDropdown(!showSortDropdown); }}
                  className="h-11 px-3 flex items-center gap-1.5 text-sm text-muted-foreground border rounded-lg py-1.5 hover:bg-muted"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{selectedSort === "cheapest_motorina" ? "Sortare" : SORT_OPTIONS.find(s => s.id === selectedSort)?.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? "rotate-180" : ""}`} />
                </button>
                {showSortDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-card border rounded-lg shadow-lg p-2 z-50">
                    {SORT_OPTIONS.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setSelectedSort(id); setShowSortDropdown(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium ${selectedSort === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nearby */}
              <button
                type="button"
                onClick={handleNearbyClick}
                disabled={isLoading}
                className="h-11 px-3 flex items-center gap-1.5 text-sm text-muted-foreground border rounded-lg py-1.5 hover:bg-muted"
              >
                <Navigation className="w-4 h-4" />
                <span className="hidden md:inline">In apropiere</span>
              </button>

              {/* Search */}
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearchDisabled}
                className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                Caută
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={handleClear}
                className="h-11 w-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial search mode - Full card
  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 mb-10">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl scale-150" />
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-[0_4px_16px_hsl(221_83%_53%/0.3)]">
            <Fuel className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-[1.75rem] font-extrabold tracking-tight text-foreground leading-tight">
            Prețuri Carburanți
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium tracking-wide uppercase">
            România
          </p>
        </div>
      </div>

      {/* Search Card */}
      <div
        className={`
          bg-card rounded-3xl p-5 space-y-4
          border transition-all duration-300 ease-out
          ${isFocused
            ? "border-primary/20 shadow-[0_0_0_3px_hsl(221_83%_53%/0.06),0_12px_40px_hsl(220_25%_12%/0.08)]"
            : "border-border/60 shadow-[0_1px_2px_hsl(220_25%_12%/0.04),0_4px_16px_hsl(220_25%_12%/0.06)]"
          }
        `}
      >
        {/* Mode Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex bg-muted/60 rounded-2xl p-1 gap-0.5">
            {(["city", "address"] as const).map((m) => {
              const active = mode === m;
              const Icon = m === "city" ? Search : MapPin;
              const label = m === "city" ? "Oraș" : "Adresă";
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`
                    relative flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold
                    transition-all duration-250 ease-out
                    ${active
                      ? "bg-card text-foreground shadow-[0_1px_4px_hsl(220_25%_12%/0.08),0_2px_8px_hsl(220_25%_12%/0.04)]"
                      : "text-muted-foreground hover:text-foreground/70"
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Row */}
        <div className="flex gap-2.5">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 pointer-events-none transition-colors group-focus-within:text-primary/60" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "city" ? "Caută după oraș..." : "Caută după adresă..."}
              disabled={isLoading}
              className="
                w-full h-[46px] pl-10 pr-4 rounded-xl
                bg-muted/40 border border-transparent
                text-foreground placeholder:text-muted-foreground/50
                text-sm font-medium
                outline-none
                transition-all duration-200
                focus:bg-card focus:border-primary/25 focus:shadow-[0_0_0_3px_hsl(221_83%_53%/0.08)]
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearchDisabled}
            className="
              h-11.5 px-6 rounded-xl
              bg-primary text-primary-foreground
              font-bold text-sm tracking-wide
              shadow-[0_2px_8px_hsl(221_83%_53%/0.3)]
              transition-all duration-200 ease-out
              hover:shadow-[0_4px_16px_hsl(221_83%_53%/0.35)] hover:-translate-y-px
              active:scale-[0.97] active:translate-y-0 active:shadow-[0_1px_4px_hsl(221_83%_53%/0.3)]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer
            "
          >
            Caută
          </button>
        </div>

        {/* Fuel Type Chips */}
        <div className="flex justify-center gap-1.5 sm:gap-2">
          {FUEL_OPTIONS.map(({ id, label, icon: Icon, color, activeBg }) => {
            const active = selectedFuels.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleFuel(id)}
                className={`
                  flex items-center gap-1 text-xs sm:text-sm text-muted-foreground border rounded-lg px-2 sm:px-3 py-1 hover:bg-muted transition-colors active:scale-[0.97]
                  ${active ? activeBg : ""}
                `}
              >
                <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${active ? color : ""}`} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Nearby Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleNearbyClick}
            disabled={isLoading}
            className="
              flex items-center gap-2 px-5 py-2.5 rounded-full
              text-[13px] font-semibold
              text-primary
              transition-all duration-200 ease-out
              hover:bg-primary/5
              active:scale-[0.96]
              disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
            "
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="w-3.5 h-3.5" />
            </div>
            In apropiere
          </button>
        </div>
      </div>
    </div>
  );
};

export default FuelSearch;
