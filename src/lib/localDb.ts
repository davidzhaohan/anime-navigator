import { Anime } from "@/types/anime";

export interface CatalogMeta {
  last_page_loaded: number;
  total_expected: number;
  completed: boolean;
  updated_at: string;
}

async function apiGet<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function apiPut(url: string, data: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const loadCatalog = async (): Promise<Anime[]> =>
  (await apiGet<Anime[]>("/api/catalog")) ?? [];

export const saveCatalog = async (list: Anime[]) => apiPut("/api/catalog", list);

export const loadCatalogMeta = async (): Promise<CatalogMeta | undefined> =>
  (await apiGet<CatalogMeta>("/api/catalog-meta")) ?? undefined;

export const saveCatalogMeta = async (meta: CatalogMeta) => apiPut("/api/catalog-meta", meta);

export const loadFinishedIds = async (): Promise<number[]> =>
  (await apiGet<number[]>("/api/finished-ids")) ?? [];

export const saveFinishedIds = async (ids: number[]) => apiPut("/api/finished-ids", ids);
