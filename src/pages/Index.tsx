import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Inbox, CheckCircle2 } from "lucide-react";
import { Anime, SortKey } from "@/types/anime";
import { FilterBar } from "@/components/FilterBar";
import { AnimeRow } from "@/components/AnimeRow";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";

const META_ID = "jikan-catalog";

// Normalize MAL rating strings like "PG-13 - Teens 13 or older" -> "PG-13"
const normalizeRating = (r: string | null): string | null => {
  if (!r) return null;
  return r.split(" - ")[0].trim();
};

const Index = () => {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finishedIds, setFinishedIds] = useState<number[]>([]);
  const [progress, setProgress] = useState<{ loaded: number; total: number; done: boolean }>({
    loaded: 0,
    total: 0,
    done: false,
  });

  // Filter / search / sort state (NOT persisted)
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("popularity");

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      try {
        // 1. Load cached catalog + finished list from DB first
        const [catalogRes, finishedRes, metaRes] = await Promise.all([
          supabase.from("anime_catalog").select("data").order("mal_id", { ascending: true }),
          supabase.from("finished_anime").select("mal_id"),
          supabase.from("catalog_meta").select("*").eq("id", META_ID).maybeSingle(),
        ]);
        if (cancelled) return;

        const cached: Anime[] = (catalogRes.data ?? []).map((r: { data: unknown }) => r.data as Anime);
        const seen = new Set<number>(cached.map((a) => a.mal_id));
        if (cached.length) setAnime(cached);
        if (finishedRes.data) setFinishedIds(finishedRes.data.map((r) => r.mal_id));
        setLoading(false);

        let startPage = (metaRes.data?.last_page_loaded ?? 0) + 1;
        const alreadyCompleted = metaRes.data?.completed ?? false;
        if (alreadyCompleted) {
          setProgress({ loaded: cached.length, total: cached.length, done: true });
          return;
        }

        // 2. Continue fetching from Jikan where we left off
        const buildUrl = (p: number) =>
          `https://api.jikan.moe/v4/anime?page=${p}&limit=25&order_by=popularity&sort=asc`;

        const persistBatch = async (batch: Anime[]) => {
          if (!batch.length) return;
          const rows = batch.map((a) => ({ mal_id: a.mal_id, data: a as never }));
          await supabase.from("anime_catalog").upsert(rows, { onConflict: "mal_id" });
        };

        const pushBatch = (batch: Anime[]): Anime[] => {
          if (!batch?.length) return [];
          const fresh = batch.filter((a) => a && !seen.has(a.mal_id));
          fresh.forEach((a) => seen.add(a.mal_id));
          if (fresh.length) setAnime((prev) => [...prev, ...fresh]);
          return fresh;
        };

        const first = await fetch(buildUrl(startPage)).then((r) => r.json());
        if (cancelled) return;
        const lastPage: number = first?.pagination?.last_visible_page ?? startPage;
        const totalItems: number = first?.pagination?.items?.total ?? lastPage * 25;

        const firstFresh = pushBatch(first.data ?? []);
        await persistBatch(firstFresh);
        setProgress({ loaded: seen.size, total: Math.max(totalItems, seen.size), done: false });
        await supabase.from("catalog_meta").upsert({
          id: META_ID,
          last_page_loaded: startPage,
          total_expected: totalItems,
          completed: startPage >= lastPage,
          updated_at: new Date().toISOString(),
        });

        for (let p = startPage + 1; p <= lastPage; p++) {
          if (cancelled) return;
          await sleep(350);
          let fresh: Anime[] = [];
          try {
            const res = await fetch(buildUrl(p));
            if (!res.ok) {
              if (res.status === 429) {
                await sleep(1500);
                const retry = await fetch(buildUrl(p)).then((r) => r.json());
                fresh = pushBatch(retry.data ?? []);
              }
            } else {
              const json = await res.json();
              fresh = pushBatch(json.data ?? []);
            }
          } catch {
            // ignore individual page errors
          }
          await persistBatch(fresh);
          if (!cancelled) {
            setProgress({ loaded: seen.size, total: totalItems, done: false });
            // persist progress every 10 pages to limit DB writes
            if (p % 10 === 0 || p === lastPage) {
              await supabase.from("catalog_meta").upsert({
                id: META_ID,
                last_page_loaded: p,
                total_expected: totalItems,
                completed: p >= lastPage,
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
        if (!cancelled) setProgress((prev) => ({ ...prev, done: true }));
      } catch (e) {
        if (!cancelled && anime.length === 0) {
          setError("Failed to load anime. Please try again later.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFinished = (id: number) => {
    setFinishedIds((prev) => {
      const isFinished = prev.includes(id);
      if (isFinished) {
        supabase.from("finished_anime").delete().eq("mal_id", id).then(() => {});
        return prev.filter((x) => x !== id);
      }
      supabase.from("finished_anime").insert({ mal_id: id }).then(() => {});
      return [...prev, id];
    });
  };

  // Build filter option lists from data
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    anime.forEach((a) => a.genres.forEach((g) => set.add(g.name)));
    return Array.from(set).sort();
  }, [anime]);

  const allRatings = useMemo(() => {
    const set = new Set<string>();
    anime.forEach((a) => {
      const r = normalizeRating(a.rating);
      if (r) set.add(r);
    });
    return Array.from(set).sort();
  }, [anime]);

  const allStatuses = useMemo(() => {
    const set = new Set<string>();
    anime.forEach((a) => a.status && set.add(a.status));
    return Array.from(set).sort();
  }, [anime]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const clearAll = () => {
    setSelectedGenres([]);
    setSelectedRatings([]);
    setSelectedStatuses([]);
    setMinScore(0);
  };

  const activeCount =
    selectedGenres.length +
    selectedRatings.length +
    selectedStatuses.length +
    (minScore > 0 ? 1 : 0);

  const applyFilters = (list: Anime[]) => {
    const q = search.trim().toLowerCase();
    let result = list.filter((a) => {
      if (q && !a.title.toLowerCase().includes(q)) return false;
      if (selectedGenres.length && !a.genres.some((g) => selectedGenres.includes(g.name)))
        return false;
      if (selectedRatings.length) {
        const r = normalizeRating(a.rating);
        if (!r || !selectedRatings.includes(r)) return false;
      }
      if (selectedStatuses.length && (!a.status || !selectedStatuses.includes(a.status)))
        return false;
      if (minScore > 0 && (a.score == null || a.score < minScore)) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "score") return (b.score ?? 0) - (a.score ?? 0);
      // popularity: lower number = more popular
      return (a.popularity ?? Infinity) - (b.popularity ?? Infinity);
    });
    return result;
  };

  const finishedSet = useMemo(() => new Set(finishedIds), [finishedIds]);
  const available = useMemo(
    () => applyFilters(anime.filter((a) => !finishedSet.has(a.mal_id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anime, finishedSet, search, selectedGenres, selectedRatings, selectedStatuses, minScore, sortBy],
  );
  const finished = useMemo(
    () => applyFilters(anime.filter((a) => finishedSet.has(a.mal_id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anime, finishedSet, search, selectedGenres, selectedRatings, selectedStatuses, minScore, sortBy],
  );

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }} />
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
            allGenres={allGenres}
            selectedGenres={selectedGenres}
            onToggleGenre={(g) => toggle(selectedGenres, setSelectedGenres, g)}
            allRatings={allRatings}
            selectedRatings={selectedRatings}
            onToggleRating={(r) => toggle(selectedRatings, setSelectedRatings, r)}
            allStatuses={allStatuses}
            selectedStatuses={selectedStatuses}
            onToggleStatus={(s) => toggle(selectedStatuses, setSelectedStatuses, s)}
            minScore={minScore}
            onMinScoreChange={setMinScore}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onClearAll={clearAll}
            activeCount={activeCount}
          />
        </div>

        {!progress.done && progress.total > 0 && (
          <div className="mb-4 rounded-lg border border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground">
            Loading anime catalog… {progress.loaded.toLocaleString()} of {progress.total.toLocaleString()} loaded
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (progress.loaded / progress.total) * 100)}%` }}
              />
            </div>
          </div>
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

const ResultsList = ({
  loading, error, items, finishedSet, onToggle, emptyLabel,
}: {
  loading: boolean;
  error: string | null;
  items: Anime[];
  finishedSet: Set<number>;
  onToggle: (id: number) => void;
  emptyLabel: string;
}) => {
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

export default Index;
