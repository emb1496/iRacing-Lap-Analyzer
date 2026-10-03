import { useRef, useState } from "react";
import { formatDelta, formatLapTime } from "../format";
import type { LapSelection, SessionSummary } from "../types";

export type Role = "ref" | "cmp";

interface Props {
  sessions: SessionSummary[];
  selection: Record<Role, LapSelection | null>;
  busy: boolean;
  onPick: (role: Role, selection: LapSelection) => void;
  onUpload: (file: File) => void;
  onDemo: () => void;
}

function isSelected(sel: LapSelection | null, sessionId: string, lap: number) {
  return sel?.sessionId === sessionId && sel.lap === lap;
}

export function SessionPanel({ sessions, selection, busy, onPick, onUpload, onDemo }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <aside
      className={`panel sessions ${dragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
      }}
    >
      <div className="actions">
        <button className="primary" disabled={busy} onClick={() => input.current?.click()}>
          Upload .ibt
        </button>
        <button disabled={busy} onClick={onDemo}>
          Load demo
        </button>
        <input
          ref={input}
          type="file"
          accept=".ibt"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {sessions.length === 0 && (
        <p className="hint">
          Drop an iRacing telemetry file here. You'll find them in{" "}
          <code>Documents\iRacing\telemetry</code> (press Alt+L in the car to start logging), or
          load the demo session.
        </p>
      )}

      {sessions.map((s) => {
        const best = s.laps.find((l) => l.number === s.best_lap)?.time ?? null;
        return (
          <section key={s.id} className="session">
            <header>
              <strong>{s.track}</strong>
              <span>
                {s.car} · {s.driver}
              </span>
              <small title={s.filename}>{s.filename}</small>
            </header>
            <table className="laps">
              <thead>
                <tr>
                  <th>Lap</th>
                  <th>Time</th>
                  <th>Gap</th>
                  <th className="pick">Ref</th>
                  <th className="pick">Cmp</th>
                </tr>
              </thead>
              <tbody>
                {s.laps.map((lap) => (
                  <tr key={lap.number} className={lap.valid ? "" : "invalid"}>
                    <td>
                      {lap.number}
                      {lap.number === s.best_lap && <span className="badge">best</span>}
                      {!lap.valid && <span className="badge muted">pit</span>}
                    </td>
                    <td className="mono">{formatLapTime(lap.time)}</td>
                    <td className="mono muted">
                      {best != null && lap.time != null && lap.number !== s.best_lap
                        ? formatDelta(lap.time - best)
                        : ""}
                    </td>
                    {(["ref", "cmp"] as const).map((role) => (
                      <td key={role} className="pick">
                        <button
                          className={`pick-btn ${role} ${
                            isSelected(selection[role], s.id, lap.number) ? "on" : ""
                          }`}
                          aria-label={`Use lap ${lap.number} as ${role === "ref" ? "reference" : "comparison"}`}
                          onClick={() => onPick(role, { sessionId: s.id, lap: lap.number })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </aside>
  );
}
