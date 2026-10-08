import { formatDelta, formatLapTime } from "../../lib/format";
import type { LapSelection, LapSummary, Role, SessionSummary } from "../../lib/types";
import { RolePick } from "./RolePick";

interface Props {
  session: SessionSummary;
  lap: LapSummary;
  /** Best lap time in the session, for the gap column. */
  best: number | null;
  selection: Record<Role, LapSelection | null>;
  onPick: (role: Role, selection: LapSelection) => void;
}

function isSelected(sel: LapSelection | null, sessionId: string, lap: number) {
  return sel?.sessionId === sessionId && sel.lap === lap;
}

export function LapRow({ session: s, lap, best, selection, onPick }: Props) {
  return (
    <tr className={lap.valid ? "" : "invalid"}>
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
        <RolePick
          key={role}
          role={role}
          lap={lap.number}
          selected={isSelected(selection[role], s.id, lap.number)}
          onPick={() => onPick(role, { sessionId: s.id, lap: lap.number })}
        />
      ))}
    </tr>
  );
}
