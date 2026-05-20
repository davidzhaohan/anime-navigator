import { useCallback, useEffect, useRef, useState } from "react";
import { Anime } from "@/types/anime";
import { fetchJikanRecentPage, sleep } from "@/lib/jikan";
import {
  loadCatalog,
  loadCatalogMeta,
  saveCatalog,
  saveCatalogMeta,
} from "@/lib/localDb";

export interface CatalogProgress {
  loaded: number;
  total: number;
  done: boolean;
}

const titleKey = (t: string) => t.trim().toLowerCase();
const pickBetter = (a: Anime, b: Anime) =>
  (b.score ?? -1) > (a.score ?? -1) ? b : a;

export const useAnimeCatalog = () => {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<CatalogProgress>({ loaded: 0, total: 0, done: true });

  // Shared in-memory indices kept in sync with local DB
  const byIdRef = useRef<Map<number, Anime>>(new Map());
  const seenRef = useRef<Set<number>>(new Set());
  const bestByTitleRef = useRef<Map<string, Anime>>(new Map());
  const runningRef = useRef(false);

  // Hydrate from local DB on mount — no network.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawCached, meta] = await Promise.all([loadCatalog(), loadCatalogMeta()]);
        if (cancelled) return;

        const seen = new Set<number>(rawCached.map((a) => a.mal_id));
        const bestByTitle = new Map<string, Anime>();
        for (const a of rawCached) {
          if (!a?.title) continue;
          const k = titleKey(a.title);
          const cur = bestByTitle.get(k);
          bestByTitle.set(k, cur ? pickBetter(cur, a) : a);
        }
        byIdRef.current = new Map(rawCached.map((a) => [a.mal_id, a]));
        seenRef.current = seen;
        bestByTitleRef.current = bestByTitle;

        const cached = Array.from(bestByTitle.values());
        setAnime(cached);
        setProgress({
          loaded: cached.length,
          total: meta?.total_expected || cached.length,
          done: true,
        });
      } catch {
        if (!cancelled) setError("Failed to load local catalog.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRefreshing(true);
    setError(null);

    const byId = byIdRef.current;
    const seen = seenRef.current;
    const bestByTitle = bestByTitleRef.current;
    let dirty = false;
    const flush = async () => {
      if (!dirty) return;
      dirty = false;
      await saveCatalog(Array.from(byId.values()));
    };

    const ingest = (batch: Anime[]) => {
      const fresh = batch.filter((a) => a && !seen.has(a.mal_id));
      fresh.forEach((a) => seen.add(a.mal_id));
      const added: Anime[] = [];
      const updated: Anime[] = [];
      for (const a of fresh) {
        if (!a?.title) continue;
        byId.set(a.mal_id, a);
        dirty = true;
        const k = titleKey(a.title);
        const cur = bestByTitle.get(k);
        if (!cur) {
          bestByTitle.set(k, a);
          added.push(a);
        } else {
          const better = pickBetter(cur, a);
          if (better !== cur) {
            bestByTitle.set(k, better);
            updated.push(better);
          }
        }
      }
      if (added.length || updated.length) {
        setAnime((prev) => {
          const next = updated.length
            ? prev.map((p) => {
                const k = titleKey(p.title);
                const u = updated.find((x) => titleKey(x.title) === k);
                return u ?? p;
              })
            : prev;
          return added.length ? [...next, ...added] : next;
        });
      }
    };

    try {
      const meta = await loadCatalogMeta();
      const prevCount = byId.size;
      const totalExpected = meta?.total_expected ?? prevCount;
      setProgress({ loaded: prevCount, total: Math.max(totalExpected, prevCount), done: false });

      // Walk recent (newest first). Stop once we hit consecutive pages with
      // no new titles — those are already in our catalog.
      const MAX_PAGES = 40;
      const STOP_AFTER_STALE = 2;
      let staleStreak = 0;
      let lastPage = MAX_PAGES;

      for (let p = 1; p <= Math.min(MAX_PAGES, lastPage); p++) {
        if (p > 1) await sleep(350);
        const page = await fetchJikanRecentPage(p);
        if (!page) continue;
        lastPage = page.lastPage;
        const before = seen.size;
        ingest(page.data);
        const newlyAdded = seen.size - before;
        setProgress({
          loaded: byId.size,
          total: Math.max(page.total || totalExpected, byId.size),
          done: false,
        });
        if (newlyAdded === 0) {
          staleStreak++;
          if (staleStreak >= STOP_AFTER_STALE) break;
        } else {
          staleStreak = 0;
        }
      }

      await flush();
      await saveCatalogMeta({
        last_page_loaded: meta?.last_page_loaded ?? 0,
        total_expected: Math.max(totalExpected, byId.size),
        completed: meta?.completed ?? false,
        updated_at: new Date().toISOString(),
      });
      setProgress((prev) => ({ ...prev, done: true }));
    } catch {
      setError("Failed to refresh catalog. Please try again later.");
    } finally {
      runningRef.current = false;
      setRefreshing(false);
    }
  }, []);

  return { anime, loading, error, progress, refresh, refreshing };
};
