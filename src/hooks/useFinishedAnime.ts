import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useFinishedAnime = () => {
  const [finishedIds, setFinishedIds] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("finished_anime").select("mal_id");
      if (cancelled) return;
      if (!error && data) setFinishedIds(data.map((r) => r.mal_id));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleFinished = useCallback(async (id: number) => {
    let willBeFinished = false;
    setFinishedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      willBeFinished = true;
      return [...prev, id];
    });
    // Side effect OUTSIDE the updater so it runs exactly once
    if (willBeFinished) {
      const { error } = await supabase
        .from("finished_anime")
        .upsert({ mal_id: id }, { onConflict: "mal_id" });
      if (error) {
        console.error("Failed to save finished anime", error);
        // rollback on failure
        setFinishedIds((prev) => prev.filter((x) => x !== id));
      }
    } else {
      const { error } = await supabase.from("finished_anime").delete().eq("mal_id", id);
      if (error) {
        console.error("Failed to remove finished anime", error);
        setFinishedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
    }
  }, []);

  return { finishedIds, toggleFinished, loaded };
};
