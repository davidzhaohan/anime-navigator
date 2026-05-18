import { useMemo, useState } from "react";
import { Anime, SortKey } from "@/types/anime";
import { normalizeRating } from "@/lib/jikan";

export const useAnimeFilters = (anime: Anime[], search: string) => {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("popularity");

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    anime.forEach((a) => a.genres.forEach((g) => set.add(g.name)));
    return Array.from(set).sort();
  }, [anime]);

  const allRatings = useMemo(() => {
    const set = new Set<string>();
    anime.forEach((a) => {
      const r = normalizeRating(a.rating);
      if (r) set.add(r);
    });
    return Array.from(set).sort();
  }, [anime]);

  const allStatuses = useMemo(() => {
    const set = new Set<string>();
    anime.forEach((a) => a.status && set.add(a.status));
    return Array.from(set).sort();
  }, [anime]);

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const clearAll = () => {
    setSelectedGenres([]);
    setSelectedRatings([]);
    setSelectedStatuses([]);
    setMinScore(0);
  };

  const activeCount =
    selectedGenres.length +
    selectedRatings.length +
    selectedStatuses.length +
    (minScore > 0 ? 1 : 0);

  const applyFilters = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list: Anime[]) => {
      let result = list.filter((a) => {
        if (q && !a.title.toLowerCase().includes(q)) return false;
        if (selectedGenres.length && !a.genres.some((g) => selectedGenres.includes(g.name)))
          return false;
        if (selectedRatings.length) {
          const r = normalizeRating(a.rating);
          if (!r || !selectedRatings.includes(r)) return false;
        }
        if (selectedStatuses.length && (!a.status || !selectedStatuses.includes(a.status)))
          return false;
        if (minScore > 0 && (a.score == null || a.score < minScore)) return false;
        return true;
      });
      result = [...result].sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "score") return (b.score ?? 0) - (a.score ?? 0);
        return (a.popularity ?? Infinity) - (b.popularity ?? Infinity);
      });
      return result;
    };
  }, [search, selectedGenres, selectedRatings, selectedStatuses, minScore, sortBy]);

  return {
    selectedGenres, selectedRatings, selectedStatuses, minScore, sortBy,
    allGenres, allRatings, allStatuses,
    setSelectedGenres, setSelectedRatings, setSelectedStatuses, setMinScore, setSortBy,
    toggle, clearAll, activeCount, applyFilters,
  };
};
