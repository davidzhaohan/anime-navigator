import { Skeleton } from "@/components/ui/skeleton";
import { Anime } from "@/types/anime";
import { AnimeRow } from "@/components/AnimeRow";

interface Props {
  loading: boolean;
  error: string | null;
  items: Anime[];
  finishedSet: Set<number>;
  onToggle: (id: number) => void;
  emptyLabel: string;
}

export const ResultsList = ({ loading, error, items, finishedSet, onToggle, emptyLabel }: Props) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 md:h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="text-base font-medium text-foreground">No results found</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((a) => (
        <AnimeRow
          key={a.mal_id}
          anime={a}
          checked={finishedSet.has(a.mal_id)}
          onToggle={() => onToggle(a.mal_id)}
        />
      ))}
    </div>
  );
};
