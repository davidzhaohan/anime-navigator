import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Filter, ArrowDownWideNarrow, X } from "lucide-react";
import { SortKey } from "@/types/anime";

interface FilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;

  allGenres: string[];
  selectedGenres: string[];
  onToggleGenre: (g: string) => void;

  allRatings: string[];
  selectedRatings: string[];
  onToggleRating: (r: string) => void;

  allStatuses: string[];
  selectedStatuses: string[];
  onToggleStatus: (s: string) => void;

  minScore: number;
  onMinScoreChange: (n: number) => void;

  sortBy: SortKey;
  onSortChange: (s: SortKey) => void;

  onClearAll: () => void;
  activeCount: number;
}

export const FilterBar = ({
  search, onSearchChange,
  allGenres, selectedGenres, onToggleGenre,
  allRatings, selectedRatings, onToggleRating,
  allStatuses, selectedStatuses, onToggleStatus,
  minScore, onMinScoreChange,
  sortBy, onSortChange,
  onClearAll, activeCount,
}: FilterBarProps) => {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search anime by title..."
            className="h-11 pl-10 bg-card shadow-card border-border/60"
          />
        </div>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 relative">
                <Filter className="h-4 w-4" />
                Filters
                {activeCount > 0 && (
                  <Badge className="ml-1 h-5 min-w-5 rounded-full bg-primary px-1.5 text-primary-foreground">
                    {activeCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(92vw,420px)] p-4 shadow-elevated">
              <div className="space-y-5">
                <FilterGroup label="Genre">
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto pr-1">
                    {allGenres.length === 0 && (
                      <p className="text-xs text-muted-foreground">Loading…</p>
                    )}
                    {allGenres.map((g) => {
                      const active = selectedGenres.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => onToggleGenre(g)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-smooth ${
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-glow"
                              : "bg-secondary text-secondary-foreground border-transparent hover:border-primary/40"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </FilterGroup>

                <FilterGroup label="Rating">
                  <div className="flex flex-wrap gap-1.5">
                    {allRatings.map((r) => {
                      const active = selectedRatings.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => onToggleRating(r)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-smooth ${
                            active
                              ? "bg-accent text-accent-foreground border-accent"
                              : "bg-secondary text-secondary-foreground border-transparent hover:border-accent/40"
                          }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </FilterGroup>

                <FilterGroup label="Status">
                  <div className="flex flex-wrap gap-1.5">
                    {allStatuses.map((s) => {
                      const active = selectedStatuses.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => onToggleStatus(s)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-smooth ${
                            active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary text-secondary-foreground border-transparent hover:border-primary/40"
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </FilterGroup>

                <FilterGroup label={`Minimum score: ${minScore.toFixed(1)}+`}>
                  <Slider
                    value={[minScore]}
                    min={0}
                    max={10}
                    step={0.5}
                    onValueChange={(v) => onMinScoreChange(v[0])}
                  />
                </FilterGroup>

                <div className="flex justify-between pt-1">
                  <Button variant="ghost" size="sm" onClick={onClearAll} className="gap-1.5">
                    <X className="h-3.5 w-3.5" /> Clear all
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortKey)}>
            <SelectTrigger className="h-11 w-[170px] gap-1.5">
              <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="score">Score</SelectItem>
              <SelectItem value="title">Alphabetical (A–Z)</SelectItem>
              <SelectItem value="aired">Airing date (newest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedGenres.map((g) => (
            <Chip key={`g-${g}`} label={g} onRemove={() => onToggleGenre(g)} />
          ))}
          {selectedRatings.map((r) => (
            <Chip key={`r-${r}`} label={r} onRemove={() => onToggleRating(r)} />
          ))}
          {selectedStatuses.map((s) => (
            <Chip key={`s-${s}`} label={s} onRemove={() => onToggleStatus(s)} />
          ))}
          {minScore > 0 && (
            <Chip label={`Score ${minScore.toFixed(1)}+`} onRemove={() => onMinScoreChange(0)} />
          )}
        </div>
      )}
    </div>
  );
};

const FilterGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);

const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <button
    type="button"
    onClick={onRemove}
    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground hover:bg-muted transition-smooth"
  >
    {label}
    <X className="h-3 w-3" />
  </button>
);
