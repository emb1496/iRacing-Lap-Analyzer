import { useDropzone } from "../../hooks/useDropzone";
import { canCompare } from "../../hooks/useSessions";
import type { LapSelection, Role, SessionSummary } from "../../lib/types";
import { SessionCard } from "./SessionCard";
import { UploadControls } from "./UploadControls";

interface Props {
  sessions: SessionSummary[];
  selection: Record<Role, LapSelection | null>;
  busy: boolean;
  onPick: (role: Role, selection: LapSelection) => void;
  onUpload: (file: File) => void;
  onDemo: () => void;
  /** Back to the file picker. Omit to hide the button. */
  onChangeFiles?: () => void;
}

const OTHER: Record<Role, Role> = { ref: "cmp", cmp: "ref" };
const NAME: Record<Role, string> = { ref: "reference", cmp: "comparison" };

/** A lap can't be used on one side if the other side is a different track or car. */
function blockedRoles(
  s: SessionSummary,
  sessions: SessionSummary[],
  selection: Record<Role, LapSelection | null>,
) {
  const blocked: Partial<Record<Role, string>> = {};
  for (const role of ["ref", "cmp"] as const) {
    const other = sessions.find((x) => x.id === selection[OTHER[role]]?.sessionId);
    if (other && !canCompare(s, other)) {
      blocked[role] = `Different track or car than the ${NAME[OTHER[role]]} lap`;
    }
  }
  return blocked;
}

export function SessionPanel({ sessions, selection, busy, onPick, onUpload, onDemo, onChangeFiles }: Props) {
  const { dragging, handlers } = useDropzone(onUpload);

  return (
    <aside className={`panel sessions ${dragging ? "dragging" : ""}`} {...handlers}>
      {onChangeFiles && sessions.length > 0 && (
        <button onClick={onChangeFiles}>Change files…</button>
      )}
      <UploadControls busy={busy} onUpload={onUpload} onDemo={onDemo} />

      {sessions.length === 0 && (
        <p className="hint">
          Drop an iRacing telemetry file here. You'll find them in{" "}
          <code>Documents\iRacing\telemetry</code> (press Alt+L in the car to start logging), or
          load the demo session.
        </p>
      )}

      {sessions.map((s) => (
        <SessionCard
          key={s.id}
          session={s}
          selection={selection}
          blocked={blockedRoles(s, sessions, selection)}
          onPick={onPick}
        />
      ))}
    </aside>
  );
}
