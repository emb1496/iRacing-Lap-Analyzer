import { useCallback, useRef, useState } from "react";
import type { LapSelection, Role, SessionSummary } from "../lib/types";

export type Selection = Record<Role, LapSelection | null>;

/** The backend only compares laps from the same track and car. */
export function canCompare(a: { track: string; car: string }, b: { track: string; car: string }) {
  return a.track === b.track && a.car === b.car;
}

function bestLap(s: SessionSummary): number | undefined {
  return s.best_lap ?? s.laps.find((l) => l.valid)?.number;
}

/** Most recent valid lap other than ``not``. */
function otherLap(s: SessionSummary, not: number | undefined): number | undefined {
  return [...s.laps].reverse().find((l) => l.valid && l.number !== not)?.number;
}

const lapOf = (s: SessionSummary, lap: number | undefined): LapSelection | null =>
  lap != null ? { sessionId: s.id, lap } : null;

/** Default pick for a freshly loaded session: best lap vs. the most recent other lap. */
function defaultSelection(s: SessionSummary): Selection {
  const best = bestLap(s);
  return { ref: lapOf(s, best), cmp: lapOf(s, otherLap(s, best)) };
}

/** Loaded sessions, which two laps are being compared, and the upload/error state around them. */
export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selection, setSelection] = useState<Selection>({ ref: null, cmp: null });
  const [sameFile, setSameFileState] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handlers read the latest values without being re-created on every change.
  const sessionsRef = useRef(sessions);
  const selectionRef = useRef(selection);
  const sameFileRef = useRef(sameFile);

  const select = (next: Selection) => {
    selectionRef.current = next;
    setSelection(next);
  };
  const setSame = (on: boolean) => {
    sameFileRef.current = on;
    setSameFileState(on);
  };

  const find = (id: string | undefined) => sessionsRef.current.find((s) => s.id === id);

  const track = (session: SessionSummary) => {
    sessionsRef.current = [...sessionsRef.current, session];
    setSessions(sessionsRef.current);
  };

  const guarded = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  /** Upload / demo: the first file picks both laps, later files become the comparison. */
  const addSession = useCallback(
    (load: () => Promise<SessionSummary>) =>
      guarded(async () => {
        const session = await load();
        track(session);
        const prev = selectionRef.current;
        if (!prev.ref) return select(defaultSelection(session));
        // A second file: compare its best lap against the current reference.
        const best = session.best_lap;
        if (best == null) return;
        if (session.id !== prev.ref.sessionId) setSame(false);
        select({ ...prev, cmp: { sessionId: session.id, lap: best } });
      }),
    [],
  );

  /**
   * Pick a file for one side of the comparison. A file that is already loaded is reused, so
   * choosing the same file for both sides loads it once.
   */
  const chooseFile = useCallback(
    (role: Role, filename: string, load: () => Promise<SessionSummary>) =>
      guarded(async () => {
        let session = sessionsRef.current.find((s) => s.filename === filename);
        if (!session) {
          session = await load();
          track(session);
        }
        const prev = selectionRef.current;
        if (role === "ref") {
          const def = defaultSelection(session);
          const cmpSession = find(prev.cmp?.sessionId);
          const keep = prev.cmp && cmpSession && canCompare(session, cmpSession) ? prev.cmp : null;
          return select({ ref: def.ref, cmp: sameFileRef.current ? def.cmp : keep });
        }
        const refSession = find(prev.ref?.sessionId);
        if (refSession && session.id === refSession.id) {
          return select({ ...prev, cmp: lapOf(session, otherLap(session, prev.ref?.lap)) });
        }
        setSame(false);
        select({ ...prev, cmp: lapOf(session, bestLap(session)) });
      }),
    [],
  );

  /** "Use the same file for both": turning it on re-points the comparison at the reference file. */
  const setSameFile = useCallback((on: boolean) => {
    setSame(on);
    const prev = selectionRef.current;
    const ref = find(prev.ref?.sessionId);
    if (on && ref) select({ ...prev, cmp: lapOf(ref, otherLap(ref, prev.ref?.lap)) });
  }, []);

  const pick = useCallback(
    (role: Role, sel: LapSelection) => select({ ...selectionRef.current, [role]: sel }),
    [],
  );

  return {
    sessions,
    selection,
    sameFile,
    busy,
    error,
    setError,
    addSession,
    chooseFile,
    setSameFile,
    pick,
  };
}
