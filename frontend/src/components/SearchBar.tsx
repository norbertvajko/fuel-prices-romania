import { useState } from "react";
import { Search, LocateFixed, MapPin, Navigation } from "lucide-react";
import { Button } from "./ui/button";

interface SearchBarProps {
  onSearchCity: (city: string) => void;
  onSearchAddress: (address: string) => void;
  onSearchNearby: () => void;
  isLoading: boolean;
}

const SearchBar = ({ onSearchCity, onSearchAddress, onSearchNearby, isLoading }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"city" | "address">("city");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (searchMode === "city") {
        onSearchCity(query.trim());
      } else {
        onSearchAddress(query.trim());
      }
    }
  };

  const isValid = query.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Search Mode Toggle */}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setSearchMode("city")}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            searchMode === "city"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Search className="h-3 w-3 inline mr-1" />
          Oraș
        </button>
        <button
          type="button"
          onClick={() => setSearchMode("address")}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            searchMode === "address"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <MapPin className="h-3 w-3 inline mr-1" />
          Adresă
        </button>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg mx-auto">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              searchMode === "city"
                ? "Caută oraș (ex. Arad, Cluj, București)"
                : "Caută adresă (ex. Strada Victoriei, Brașov)"
            }
            className="w-full h-11 pl-10 pr-4 rounded-lg border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSearchNearby}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-sm text-muted-foreground border rounded-lg px-3 py-2 hover:bg-muted transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Navigation className="w-3.5 h-3.5" />
            În apropiere
          </button>
          <button
            type="submit"
            disabled={isLoading || !isValid}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Caută
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
