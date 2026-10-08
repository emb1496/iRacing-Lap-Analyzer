import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { Comparison } from "../lib/types";
import type { Selection } from "./useSessions";

interface Callbacks {
  /** Called when a new comparison arrives, so views can reset hover and zoom with it. */
  onLoaded: () => void;
  onError: (message: string) => void;
}

/** Fetches the comparison for the chosen laps, aborting a stale request when they change. */
export function useComparison(selection: Selection, callbacks: Callbacks) {
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const latest = useRef(callbacks);
  latest.current = callbacks;

  useEffect(() => {
    const { ref, cmp } = selection;
    if (!ref || !cmp) return;
    const controller = new AbortController();
    api
      .compare(ref, cmp, controller.signal)
      .then((result) => {
        setComparison(result);
        latest.current.onLoaded();
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          latest.current.onError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => controller.abort();
  }, [selection]);

  return comparison;
}
