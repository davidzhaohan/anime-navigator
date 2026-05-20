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

const parsePage = (json: any, page: number): JikanPage => ({
  data: json?.data ?? [],
  lastPage: json?.pagination?.last_visible_page ?? page,
  total: json?.pagination?.items?.total ?? 0,
});

const retryDelay = (res: Response) => {
  const retryAfter = Number(res.headers.get("retry-after"));
  return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1800;
};

const fetchUrl = async (url: string, page: number): Promise<JikanPage | null> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    if (res.ok) return parsePage(await res.json(), page);
    if (res.status !== 429 && res.status < 500) return null;
    await sleep(retryDelay(res) * (attempt + 1));
  }
  return null;
};

export const fetchJikanPage = (page: number) => fetchUrl(buildJikanUrl(page), page);
export const fetchJikanRecentPage = (page: number) =>
  fetchUrl(buildJikanRecentUrl(page), page);

// Normalize MAL rating strings like "PG-13 - Teens 13 or older" -> "PG-13"
export const normalizeRating = (r: string | null): string | null => {
  if (!r) return null;
  return r.split(" - ")[0].trim();
};
