import { useMemo, useState } from "react";
import { formatDateTime } from "../../lib/format";
import type { Library, LibraryFile, Role } from "../../lib/types";

interface Props {
  /** Null until the first lookup finishes. */
  library: Library | null;
  loading: boolean;
  busy: boolean;
  /** File names currently chosen for each side. */
  chosen: Record<Role, string | null>;
  /** Track and car the comparison must match, once a reference is chosen. */
  reference: { track: string; car: string } | null;
  sameFile: boolean;
  onSameFile: (on: boolean) => void;
  onChoose: (role: Role, file: LibraryFile) => void;
  onRescan: () => void;
  onDemo: () => void;
}

const ROLE_LABEL: Record<Role, string> = { ref: "reference", cmp: "comparison" };

function matches(file: LibraryFile, query: string) {
  const haystack = [file.track, file.car, file.driver, file.session_type ?? "", file.name]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/** The launch screen: telemetry files found on disk, each with a reference and comparison pick. */
export function FilePicker({
  library,
  loading,
  busy,
  chosen,
  reference,
  sameFile,
  onSameFile,
  onChoose,
  onRescan,
  onDemo,
}: Props) {
  const [query, setQuery] = useState("");
  const files = useMemo(
    () => (library?.files ?? []).filter((f) => matches(f, query)),
    [library, query],
  );

  const mismatch = (f: LibraryFile) =>
    reference != null && (f.track !== reference.track || f.car !== reference.car);

  return (
    <div className="file-picker">
      <h2>Pick your laps</h2>
      <p className="hint">
        Choose a recording for the <strong className="ref-text">reference</strong> lap and one for
        the <strong className="cmp-text">comparison</strong> lap. Both can be the same file.
      </p>

      <div className="picker-bar">
        <label className="same-file">
          <input
            type="checkbox"
            checked={sameFile}
            onChange={(e) => onSameFile(e.target.checked)}
          />
          Use the same file for both
        </label>
        <input
          type="search"
          placeholder="Filter by track, car, driver…"
          aria-label="Filter files"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button disabled={loading} onClick={onRescan}>
          Rescan
        </button>
      </div>

      {loading && !library && <p className="hint">Looking for your telemetry files…</p>}

      {library && library.directory == null && (
        <p className="hint">
          Couldn't find your iRacing telemetry folder (usually{" "}
          <code>Documents\iRacing\telemetry</code>). Upload a file instead, or start the app with{" "}
          <code>IRACING_TELEMETRY_DIR</code> set to the folder.
        </p>
      )}

      {library && library.directory != null && library.files.length === 0 && (
        <p className="hint">
          No .ibt files in <code>{library.directory}</code>. Press Alt+L in the car to start
          logging.
        </p>
      )}

      {library && library.files.length > 0 && (
        <>
          <table className="files">
            <thead>
              <tr>
                <th>Recorded</th>
                <th>Track</th>
                <th>Car</th>
                <th>Session</th>
                <th>Laps</th>
                <th className="pick">Ref</th>
                <th className="pick">Cmp</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.name} title={f.name}>
                  <td className="mono">{formatDateTime(f.recorded_at)}</td>
                  <td>{f.track}</td>
                  <td>{f.car}</td>
                  <td>{f.session_type && <span className="badge muted">{f.session_type}</span>}</td>
                  <td className="mono">{f.lap_count ?? ""}</td>
                  {(["ref", "cmp"] as const).map((role) => {
                    const blocked = role === "cmp" && mismatch(f);
                    return (
                      <td key={role} className="pick">
                        <button
                          className={`pick-btn ${role} ${chosen[role] === f.name ? "on" : ""}`}
                          aria-label={`Use ${f.name} as ${ROLE_LABEL[role]}`}
                          disabled={busy || blocked || (role === "cmp" && sameFile)}
                          title={
                            blocked
                              ? "Different track or car than the reference"
                              : role === "cmp" && sameFile
                                ? "Untick “Use the same file for both” to pick another file"
                                : undefined
                          }
                          onClick={() => onChoose(role, f)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {files.length === 0 && <p className="hint">No files match “{query}”.</p>}
        </>
      )}

      <p className="hint">
        Files from elsewhere: drop an .ibt onto the sidebar or use Upload. Or{" "}
        <button className="link" disabled={busy} onClick={onDemo}>
          try the demo session
        </button>
        .
      </p>
    </div>
  );
}
