import { createStore, get, set } from "idb-keyval";
import { Anime } from "@/types/anime";

const store = createStore("anime-tracker", "kv");

const CATALOG_KEY = "catalog";
const META_KEY = "catalog-meta";
const FINISHED_KEY = "finished-ids";

export interface CatalogMeta {
  last_page_loaded: number;
  total_expected: number;
  completed: boolean;
  updated_at: string;
}

export const loadCatalog = async (): Promise<Anime[]> =>
  (await get<Anime[]>(CATALOG_KEY, store)) ?? [];

export const saveCatalog = async (list: Anime[]) => set(CATALOG_KEY, list, store);

export const loadCatalogMeta = async (): Promise<CatalogMeta | undefined> =>
  get<CatalogMeta>(META_KEY, store);

export const saveCatalogMeta = async (meta: CatalogMeta) => set(META_KEY, meta, store);

export const loadFinishedIds = async (): Promise<number[]> =>
  (await get<number[]>(FINISHED_KEY, store)) ?? [];

export const saveFinishedIds = async (ids: number[]) => set(FINISHED_KEY, ids, store);
