import { useDropzone } from "../../hooks/useDropzone";
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
}

export function SessionPanel({ sessions, selection, busy, onPick, onUpload, onDemo }: Props) {
  const { dragging, handlers } = useDropzone(onUpload);

  return (
    <aside className={`panel sessions ${dragging ? "dragging" : ""}`} {...handlers}>
      <UploadControls busy={busy} onUpload={onUpload} onDemo={onDemo} />

      {sessions.length === 0 && (
        <p className="hint">
          Drop an iRacing telemetry file here. You'll find them in{" "}
          <code>Documents\iRacing\telemetry</code> (press Alt+L in the car to start logging), or
          load the demo session.
        </p>
      )}

      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} selection={selection} onPick={onPick} />
      ))}
    </aside>
  );
}
