import { Anime } from "@/types/anime";

export const JIKAN_PAGE_LIMIT = 25;

export const buildJikanUrl = (page: number) =>
  `https://api.jikan.moe/v4/anime?page=${page}&limit=${JIKAN_PAGE_LIMIT}&order_by=popularity&sort=asc`;

export const buildJikanRecentUrl = (page: number) =>
  `https://api.jikan.moe/v4/anime?page=${page}&limit=${JIKAN_PAGE_LIMIT}&order_by=start_date&sort=desc`;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface JikanPage {
  data: Anime[];
  lastPage: number;
  total: number;
}

export const fetchJikanPage = async (page: number): Promise<JikanPage | null> => {
  const res = await fetch(buildJikanUrl(page));
  if (!res.ok) {
    if (res.status === 429) {
      await sleep(1500);
      const retry = await fetch(buildJikanUrl(page));
      if (!retry.ok) return null;
      const json = await retry.json();
      return {
        data: json?.data ?? [],
        lastPage: json?.pagination?.last_visible_page ?? page,
        total: json?.pagination?.items?.total ?? 0,
      };
    }
    return null;
  }
  const json = await res.json();
  return {
    data: json?.data ?? [],
    lastPage: json?.pagination?.last_visible_page ?? page,
    total: json?.pagination?.items?.total ?? 0,
  };
};

// Normalize MAL rating strings like "PG-13 - Teens 13 or older" -> "PG-13"
export const normalizeRating = (r: string | null): string | null => {
  if (!r) return null;
  return r.split(" - ")[0].trim();
};
