export interface Anime {
  mal_id: number;
  title: string;
  synopsis: string | null;
  images: {
    jpg: { image_url: string; large_image_url?: string };
  };
  genres: { mal_id: number; name: string }[];
  rating: string | null;       // e.g. "PG-13 - Teens 13 or older"
  score: number | null;
  popularity: number | null;
  status: string | null;       // "Currently Airing", "Finished Airing", etc.
  aired?: { from: string | null; to: string | null } | null;
}

export type SortKey = "popularity" | "score" | "title" | "aired";
