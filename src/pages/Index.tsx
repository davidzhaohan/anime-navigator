import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Inbox, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/FilterBar";
import { ResultsList } from "@/components/ResultsList";
import { CatalogProgressBar } from "@/components/CatalogProgressBar";
import { useDebounce } from "@/hooks/useDebounce";
import { useAnimeCatalog } from "@/hooks/useAnimeCatalog";
import { useFinishedAnime } from "@/hooks/useFinishedAnime";
import { useAnimeFilters } from "@/hooks/useAnimeFilters";

const Index = () => {
  const { anime, loading, error, progress, refresh, refreshing } = useAnimeCatalog();
  const { finishedIds, toggleFinished } = useFinishedAnime();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const f = useAnimeFilters(anime, search);

  const finishedSet = useMemo(() => new Set(finishedIds), [finishedIds]);
  const available = useMemo(
    () => f.applyFilters(anime.filter((a) => !finishedSet.has(a.mal_id))),
    [anime, finishedSet, f],
  );
  const finished = useMemo(
    () => f.applyFilters(anime.filter((a) => finishedSet.has(a.mal_id))),
    [anime, finishedSet, f],
  );

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 60px 60px",
          }}
        />
        <div className="container relative mx-auto px-4 py-10 md:py-14">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.25em] opacity-90">
            <Sparkles className="h-4 w-4" /> Anime Todo Tracker
          </div>
          <h1 className="mt-3 text-3xl md:text-5xl font-bold leading-tight">
            Find your next obsession.
          </h1>
          <p className="mt-2 max-w-xl text-sm md:text-base opacity-90">
            Search, filter and sort top anime — then check them off as you watch.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-5">
          <FilterBar
            search={searchInput}
            onSearchChange={setSearchInput}
            allGenres={f.allGenres}
            selectedGenres={f.selectedGenres}
            onToggleGenre={(g) => f.toggle(f.selectedGenres, f.setSelectedGenres, g)}
            allRatings={f.allRatings}
            selectedRatings={f.selectedRatings}
            onToggleRating={(r) => f.toggle(f.selectedRatings, f.setSelectedRatings, r)}
            allStatuses={f.allStatuses}
            selectedStatuses={f.selectedStatuses}
            onToggleStatus={(s) => f.toggle(f.selectedStatuses, f.setSelectedStatuses, s)}
            minScore={f.minScore}
            onMinScoreChange={f.setMinScore}
            sortBy={f.sortBy}
            onSortChange={f.setSortBy}
            onClearAll={f.clearAll}
            activeCount={f.activeCount}
          />
        </div>

        {!progress.done && progress.total > 0 && (
          <CatalogProgressBar loaded={progress.loaded} total={progress.total} />
        )}

        <Tabs defaultValue="available" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-5">
            <TabsTrigger value="available" className="gap-2">
              <Inbox className="h-4 w-4" />
              Available
              <span className="ml-1 rounded-full bg-background/40 px-1.5 text-[10px]">
                {available.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="finished" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Finished
              <span className="ml-1 rounded-full bg-background/40 px-1.5 text-[10px]">
                {finished.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <ResultsList
              loading={loading}
              error={error}
              items={available}
              finishedSet={finishedSet}
              onToggle={toggleFinished}
              emptyLabel="No anime match your filters."
            />
          </TabsContent>

          <TabsContent value="finished">
            <ResultsList
              loading={loading}
              error={error}
              items={finished}
              finishedSet={finishedSet}
              onToggle={toggleFinished}
              emptyLabel="Nothing finished yet — check off anime in the Available tab!"
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
