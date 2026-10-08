export type Mode = "delta" | "line";

interface Props {
  lineMode: boolean;
  lineAvailable: boolean;
  onChange: (mode: Mode) => void;
}

export function ModeChips({ lineMode, lineAvailable, onChange }: Props) {
  return (
    <div className="map-header">
      <div className="chips" role="group" aria-label="Map view">
        <button className="chip" aria-pressed={!lineMode} onClick={() => onChange("delta")}>
          Delta
        </button>
        <button
          className="chip"
          aria-pressed={lineMode}
          disabled={!lineAvailable}
          onClick={() => onChange("line")}
        >
          Line
        </button>
      </div>
    </div>
  );
}
