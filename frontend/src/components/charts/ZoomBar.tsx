import type { Ref } from "react";
import { useUnits } from "../../context/UnitsContext";
import type { Range } from "../../lib/range";
import type { Comparison } from "../../lib/types";
import { formatShortDist } from "../../lib/units";
import { CornerChip } from "./CornerChip";

interface Props {
  comparison: Comparison;
  zoom: Range | null;
  onZoom: (range: Range | null) => void;
  /** The brush overlay is positioned below this bar, so it needs to measure it. */
  ref?: Ref<HTMLDivElement>;
}

export function ZoomBar({ comparison: c, zoom, onZoom, ref }: Props) {
  const { units } = useUnits();
  return (
    <div className="zoom-bar" ref={ref}>
      <span className="hint">
        {zoom
          ? `Showing ${formatShortDist(zoom[0], units)} – ${formatShortDist(zoom[1], units)}`
          : "Drag on any chart to zoom"}
      </span>
      <div className="chips" role="group" aria-label="Zoom to corner">
        {c.corners.map((corner) => (
          <CornerChip
            key={corner.number}
            corner={corner}
            trackLength={c.track_length}
            zoom={zoom}
            onZoom={onZoom}
          />
        ))}
      </div>
      <button className="chip" disabled={!zoom} onClick={() => onZoom(null)}>
        Reset zoom
      </button>
    </div>
  );
}
