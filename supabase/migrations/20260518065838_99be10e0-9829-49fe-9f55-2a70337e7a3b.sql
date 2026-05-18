
CREATE TABLE public.anime_catalog (
  mal_id INTEGER PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.finished_anime (
  mal_id INTEGER PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.catalog_meta (
  id TEXT PRIMARY KEY,
  last_page_loaded INTEGER NOT NULL DEFAULT 0,
  total_expected INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anime_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finished_anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read anime_catalog" ON public.anime_catalog FOR SELECT USING (true);
CREATE POLICY "Public write anime_catalog" ON public.anime_catalog FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update anime_catalog" ON public.anime_catalog FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public read finished_anime" ON public.finished_anime FOR SELECT USING (true);
CREATE POLICY "Public write finished_anime" ON public.finished_anime FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete finished_anime" ON public.finished_anime FOR DELETE USING (true);

CREATE POLICY "Public read catalog_meta" ON public.catalog_meta FOR SELECT USING (true);
CREATE POLICY "Public write catalog_meta" ON public.catalog_meta FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update catalog_meta" ON public.catalog_meta FOR UPDATE USING (true) WITH CHECK (true);

CREATE INDEX idx_anime_catalog_updated ON public.anime_catalog(updated_at);
