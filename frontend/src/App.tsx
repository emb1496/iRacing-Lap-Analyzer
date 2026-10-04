import { useEffect, useState } from "react";
import { api } from "./api";
import { CornerTable } from "./components/CornerTable";
import { type Role, SessionPanel } from "./components/SessionPanel";
import { TelemetryCharts } from "./components/TelemetryCharts";
import { TrackMap } from "./components/TrackMap";
import { cornerRange, formatDelta, formatLapTime, type Range } from "./format";
import { describeCorner } from "./insight";
import type { Comparison, LapSelection, SessionSummary } from "./types";
import { useUnits } from "./units";

/** Default pick for a freshly loaded session: best lap vs. the most recent other lap. */
function defaultSelection(s: SessionSummary): Record<Role, LapSelection | null> {
  const valid = s.laps.filter((l) => l.valid);
  const best = s.best_lap ?? valid[0]?.number;
  const latest = [...valid].reverse().find((l) => l.number !== best)?.number;
  return {
    ref: best != null ? { sessionId: s.id, lap: best } : null,
    cmp: latest != null ? { sessionId: s.id, lap: latest } : null,
  };
}

export default function App() {
  const { units, setUnits } = useUnits();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selection, setSelection] = useState<Record<Role, LapSelection | null>>({
    ref: null,
    cmp: null,
  });
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState<Range | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addSession(load: () => Promise<SessionSummary>) {
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
  }

  useEffect(() => {
    const { ref, cmp } = selection;
    if (!ref || !cmp) return;
    const controller = new AbortController();
    api
      .compare(ref, cmp, controller.signal)
      .then((result) => {
        setComparison(result);
        setHoverIndex(null);
        setZoom(null);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
      });
    return () => controller.abort();
  }, [selection]);

  const worst = comparison?.corners.reduce(
    (a, b) => (b.time_delta > a.time_delta ? b : a),
    comparison.corners[0],
  );
  const total = comparison ? comparison.cmp.lap_time - comparison.ref.lap_time : 0;

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          Lap<span>Analyzer</span>
        </h1>
        {comparison && <span className="track">{comparison.track}</span>}
        <div className="unit-toggle" role="group" aria-label="Units">
          {(["metric", "imperial"] as const).map((u) => (
            <button key={u} aria-pressed={units === u} onClick={() => setUnits(u)}>
              {u === "metric" ? "km · m" : "mi · ft"}
            </button>
          ))}
        </div>
      </header>

      <SessionPanel
        sessions={sessions}
        selection={selection}
        busy={busy}
        onPick={(role, sel) => setSelection((prev) => ({ ...prev, [role]: sel }))}
        onUpload={(file) => addSession(() => api.upload(file))}
        onDemo={() => addSession(api.loadDemo)}
      />

      <main>
        {error && (
          <div className="error" role="alert">
            {error}
            <button onClick={() => setError(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {!comparison ? (
          <div className="empty-state">
            <h2>Where are you losing time?</h2>
            <p>
              Load a session and pick two laps. Lap Analyzer lines them up by distance and shows
              you, corner by corner, where the time goes and why.
            </p>
            <button className="primary" disabled={busy} onClick={() => addSession(api.loadDemo)}>
              Try the demo session
            </button>
          </div>
        ) : (
          <>
            <section className="summary">
              <div className="stat ref">
                <label>Reference · {comparison.ref.label}</label>
                <strong>{formatLapTime(comparison.ref.lap_time)}</strong>
              </div>
              <div className="stat cmp">
                <label>Compared · {comparison.cmp.label}</label>
                <strong>{formatLapTime(comparison.cmp.lap_time)}</strong>
              </div>
              <div className={`stat ${total > 0 ? "loss" : "gain"}`}>
                <label>Gap</label>
                <strong>{formatDelta(total)}s</strong>
              </div>
              {worst && worst.time_delta > 0.02 && (
                <div className="stat headline">
                  <label>Biggest loss</label>
                  <span>Turn {worst.number}: {describeCorner(worst, units)}</span>
                </div>
              )}
            </section>

            <section className="overview">
              <TrackMap comparison={comparison} hoverIndex={hoverIndex} zoom={zoom} />
              <CornerTable
                comparison={comparison}
                onHover={setHoverIndex}
                onSelect={(k) => setZoom(cornerRange(k, comparison.track_length))}
              />
            </section>

            <section className="panel">
              <TelemetryCharts comparison={comparison} onHover={setHoverIndex} zoom={zoom} onZoom={setZoom} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
