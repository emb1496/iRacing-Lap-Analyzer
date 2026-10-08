import { useCallback, useState } from "react";
import type { LapSelection, Role, SessionSummary } from "../lib/types";

export type Selection = Record<Role, LapSelection | null>;

/** Default pick for a freshly loaded session: best lap vs. the most recent other lap. */
function defaultSelection(s: SessionSummary): Selection {
  const valid = s.laps.filter((l) => l.valid);
  const best = s.best_lap ?? valid[0]?.number;
  const latest = [...valid].reverse().find((l) => l.number !== best)?.number;
  return {
    ref: best != null ? { sessionId: s.id, lap: best } : null,
    cmp: latest != null ? { sessionId: s.id, lap: latest } : null,
  };
}

/** Loaded sessions, which two laps are being compared, and the upload/error state around them. */
export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selection, setSelection] = useState<Selection>({ ref: null, cmp: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addSession = useCallback(async (load: () => Promise<SessionSummary>) => {
    setBusy(true);
    setError(null);
    try {
      const session = await load();
      setSessions((prev) => [...prev, session]);
      setSelection((prev) => {
        if (!prev.ref) return defaultSelection(session);
        // A second file: compare its best lap against the current reference.
        const best = session.best_lap;
        return best != null ? { ...prev, cmp: { sessionId: session.id, lap: best } } : prev;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const pick = useCallback(
    (role: Role, sel: LapSelection) => setSelection((prev) => ({ ...prev, [role]: sel })),
    [],
  );

  return { sessions, selection, busy, error, setError, addSession, pick };
}
