import { Anime } from "@/types/anime";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";

interface AnimeRowProps {
  anime: Anime;
  checked: boolean;
  onToggle: () => void;
}

export const AnimeRow = ({ anime, checked, onToggle }: AnimeRowProps) => {
  return (
    <div className="group grid grid-cols-[80px_1fr_auto] gap-4 rounded-xl border border-border/60 bg-card p-3 shadow-card transition-smooth hover:shadow-elevated hover:border-primary/40 md:grid-cols-[100px_1fr_auto] md:gap-5 md:p-4">
      <img
        src={anime.images.jpg.image_url}
        alt={anime.title}
        loading="lazy"
        className="h-28 w-20 md:h-36 md:w-24 rounded-lg object-cover shadow-card"
      />

      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold leading-tight text-foreground line-clamp-2">
            {anime.title}
          </h3>
          {anime.score != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Star className="h-3 w-3 fill-current" />
              {anime.score.toFixed(1)}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 md:line-clamp-3">
          {anime.synopsis ?? "No description available."}
        </p>

        <div className="flex flex-wrap gap-1 pt-0.5">
          {anime.genres.slice(0, 4).map((g) => (
            <span
              key={g.mal_id}
              className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {g.name}
            </span>
          ))}
          {anime.status && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-foreground/90">
              {anime.status}
            </span>
          )}
        </div>
      </div>

      <label className="flex flex-col items-center justify-center gap-1.5 self-center rounded-lg border border-border/50 bg-background/60 px-3 py-2 cursor-pointer transition-smooth hover:border-primary/60 hover:bg-primary/5">
        <Checkbox checked={checked} onCheckedChange={onToggle} className="h-5 w-5" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {checked ? "Watched" : "Todo"}
        </span>
      </label>
    </div>
  );
};
