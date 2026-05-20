import { useCallback, useEffect, useRef, useState } from "react";
import { Anime } from "@/types/anime";
import { fetchJikanPage, fetchJikanRecentPage, JIKAN_PAGE_LIMIT, sleep } from "@/lib/jikan";
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
const RECENT_SCAN_PAGES = 8;
const EXPANSION_BATCH_PAGES = 40;
const REQUEST_DELAY_MS = 450;

const inferLoadedPopularityPage = (storedPage: number | undefined, localCount: number) => {
  if (storedPage && storedPage > 0) return storedPage;
  const likelyRecentOnlyCount = RECENT_SCAN_PAGES * JIKAN_PAGE_LIMIT;
  return Math.max(0, Math.floor(Math.max(0, localCount - likelyRecentOnlyCount) / JIKAN_PAGE_LIMIT));
};

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
      let totalExpected = meta?.total_expected ?? prevCount;
      setProgress({ loaded: prevCount, total: Math.max(totalExpected, prevCount), done: false });

      let lastPage = Number.POSITIVE_INFINITY;
      let requestsMade = 0;

      const waitForNextRequest = async () => {
        if (requestsMade > 0) await sleep(REQUEST_DELAY_MS);
        requestsMade++;
      };

      // First scan the newest pages so newly announced anime are picked up even
      // when they appear before the saved popularity cursor.
      for (let p = 1; p <= Math.min(RECENT_SCAN_PAGES, lastPage); p++) {
        await waitForNextRequest();
        const page = await fetchJikanRecentPage(p);
        if (!page) continue;
        lastPage = page.lastPage || lastPage;
        totalExpected = Math.max(totalExpected, page.total || 0);
        ingest(page.data);
        setProgress({
          loaded: bestByTitle.size,
          total: Math.max(totalExpected, bestByTitle.size),
          done: false,
        });
      }

      // Then continue the full catalog crawl in popularity order. This cursor is
      // persisted, so every button click advances another batch instead of
      // repeatedly stopping on already-cached recent pages.
      let lastLoadedPopularityPage = inferLoadedPopularityPage(meta?.last_page_loaded, byId.size);
      const startPage = lastLoadedPopularityPage + 1;
      const endPage = Math.min(startPage + EXPANSION_BATCH_PAGES - 1, lastPage);

      for (let p = startPage; p <= endPage; p++) {
        await waitForNextRequest();
        const page = await fetchJikanPage(p);
        if (!page) continue;
        lastPage = Math.min(lastPage, page.lastPage || lastPage);
        totalExpected = Math.max(totalExpected, page.total || 0);
        ingest(page.data);
        lastLoadedPopularityPage = Math.max(lastLoadedPopularityPage, p);
        setProgress({
          loaded: bestByTitle.size,
          total: Math.max(totalExpected, bestByTitle.size),
          done: false,
        });
        if (p >= lastPage) break;
      }

      await flush();
      await saveCatalogMeta({
        last_page_loaded: lastLoadedPopularityPage,
        total_expected: Math.max(totalExpected, bestByTitle.size),
        completed: Number.isFinite(lastPage) && lastLoadedPopularityPage >= lastPage,
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
