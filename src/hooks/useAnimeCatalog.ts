import { useEffect, useState } from "react";
import { Anime } from "@/types/anime";
import { supabase } from "@/integrations/supabase/client";
import { fetchJikanPage, sleep } from "@/lib/jikan";

const META_ID = "jikan-catalog";

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
        // 1. Hydrate from DB
        const [catalogRes, metaRes] = await Promise.all([
          supabase.from("anime_catalog").select("data").order("mal_id", { ascending: true }),
          supabase.from("catalog_meta").select("*").eq("id", META_ID).maybeSingle(),
        ]);
        if (cancelled) return;

        const rawCached: Anime[] = (catalogRes.data ?? []).map(
          (r: { data: unknown }) => r.data as Anime,
        );
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

        if (metaRes.data?.completed) {
          setProgress({ loaded: cached.length, total: cached.length, done: true });
          return;
        }

        // 2. Resume Jikan fetch from where we left off
        const startPage = (metaRes.data?.last_page_loaded ?? 0) + 1;

        const persist = async (batch: Anime[]) => {
          if (!batch.length) return;
          const rows = batch.map((a) => ({ mal_id: a.mal_id, data: a as never }));
          await supabase.from("anime_catalog").upsert(rows, { onConflict: "mal_id" });
        };

        const ingest = (batch: Anime[]): Anime[] => {
          const fresh = batch.filter((a) => a && !seen.has(a.mal_id));
          fresh.forEach((a) => seen.add(a.mal_id));
          if (fresh.length) setAnime((prev) => [...prev, ...fresh]);
          return fresh;
        };

        const first = await fetchJikanPage(startPage);
        if (cancelled || !first) return;
        const lastPage = first.lastPage;
        const totalItems = first.total || lastPage * 25;

        await persist(ingest(first.data));
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
          const page = await fetchJikanPage(p);
          if (page) await persist(ingest(page.data));
          if (cancelled) return;
          setProgress({ loaded: seen.size, total: totalItems, done: false });
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
