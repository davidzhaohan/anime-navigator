import { useCallback, useEffect, useState } from "react";
import { loadFinishedIds, saveFinishedIds } from "@/lib/localDb";

export const useFinishedAnime = () => {
  const [finishedIds, setFinishedIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = await loadFinishedIds();
      if (cancelled) return;
      setFinishedIds(ids);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFinished = useCallback(async (id: number) => {
    let nextIds: number[] = [];
    setFinishedIds((prev) => {
      nextIds = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return nextIds;
    });
    try {
      await saveFinishedIds(nextIds);
    } catch (e) {
      console.error("Failed to persist finished ids", e);
    }
  }, []);

  return { finishedIds, toggleFinished, loaded };
};
