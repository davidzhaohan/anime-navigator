import { useEffect, useState } from "react";
import { Anime } from "@/types/anime";
import { fetchJikanPage, sleep } from "@/lib/jikan";
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

export const useAnimeCatalog = () => {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CatalogProgress>({ loaded: 0, total: 0, done: false });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Hydrate from local DB
        const [rawCached, meta] = await Promise.all([loadCatalog(), loadCatalogMeta()]);
        if (cancelled) return;

        const seen = new Set<number>(rawCached.map((a) => a.mal_id));
        const titleKey = (t: string) => t.trim().toLowerCase();
        const bestByTitle = new Map<string, Anime>();
        const pickBetter = (a: Anime, b: Anime) =>
          (b.score ?? -1) > (a.score ?? -1) ? b : a;
        for (const a of rawCached) {
          if (!a?.title) continue;
          const k = titleKey(a.title);
          const cur = bestByTitle.get(k);
          bestByTitle.set(k, cur ? pickBetter(cur, a) : a);
        }
        const cached = Array.from(bestByTitle.values());
        if (cached.length) setAnime(cached);
        setLoading(false);
        setProgress({
          loaded: cached.length,
          total: meta?.total_expected || cached.length,
          done: !!meta?.completed,
        });

        // Working buffer — all anime keyed by mal_id, persisted in batches
        const byId = new Map<number, Anime>(rawCached.map((a) => [a.mal_id, a]));
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

        // 2. Always ping Jikan on startup for new pages.
        // Resume from the page after the last persisted one; if catalog was marked
        // completed, re-check from page 1 in case new titles were added.
        const startPage = meta?.completed ? 1 : (meta?.last_page_loaded ?? 0) + 1;

        const first = await fetchJikanPage(startPage);
        if (cancelled || !first) return;
        const lastPage = first.lastPage;
        const totalItems = first.total || lastPage * 25;

        ingest(first.data);
        await flush();
        setProgress({ loaded: seen.size, total: Math.max(totalItems, seen.size), done: false });
        await saveCatalogMeta({
          last_page_loaded: startPage,
          total_expected: totalItems,
          completed: startPage >= lastPage,
          updated_at: new Date().toISOString(),
        });

        for (let p = startPage + 1; p <= lastPage; p++) {
          if (cancelled) return;
          await sleep(350);
          const page = await fetchJikanPage(p);
          if (page) ingest(page.data);
          if (cancelled) return;
          setProgress({ loaded: seen.size, total: totalItems, done: false });
          if (p % 10 === 0 || p === lastPage) {
            await flush();
            await saveCatalogMeta({
              last_page_loaded: p,
              total_expected: totalItems,
              completed: p >= lastPage,
              updated_at: new Date().toISOString(),
            });
          }
        }
        await flush();
        if (!cancelled) setProgress((prev) => ({ ...prev, done: true }));
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load anime. Please try again later.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { anime, loading, error, progress };
};
