import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Library } from "../lib/types";

/** The telemetry files found on disk. A failed lookup reads as "no folder", so uploads still work. */
export function useLibrary() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLibrary(await api.library());
    } catch {
      setLibrary({ directory: null, files: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { library, loading, refresh };
}
