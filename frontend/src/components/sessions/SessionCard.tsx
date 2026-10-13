import { formatDateTime } from "../../lib/format";
import type { LapSelection, Role, SessionSummary } from "../../lib/types";
import { LapRow } from "./LapRow";

interface Props {
  session: SessionSummary;
  selection: Record<Role, LapSelection | null>;
  blocked?: Partial<Record<Role, string>>;
  onPick: (role: Role, selection: LapSelection) => void;
}

export function SessionCard({ session: s, selection, blocked, onPick }: Props) {
  const best = s.laps.find((l) => l.number === s.best_lap)?.time ?? null;
  return (
    <section className="session">
      <header>
        <strong>{s.track}</strong>
        <span>
          {s.car} · {s.driver}
        </span>
        {s.recorded_at && (
          <span>
            {formatDateTime(s.recorded_at)}
            {s.session_type && ` · ${s.session_type}`}
          </span>
        )}
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
            <LapRow
              key={lap.number}
              session={s}
              lap={lap}
              best={best}
              selection={selection}
              blocked={blocked}
              onPick={onPick}
            />
          ))}
        </tbody>
      </table>
    </section>
  );
}
