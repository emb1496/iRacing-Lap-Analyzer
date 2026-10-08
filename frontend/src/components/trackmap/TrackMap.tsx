import { useMemo, useState } from "react";
import { indexAt, type Range } from "../../lib/range";
import type { Comparison } from "../../lib/types";
import { PX } from "./constants";
import { DeltaLayer } from "./DeltaLayer";
import { buildTrackGeometry, lineViewBox, SIZE } from "./geometry";
import { HoverDots } from "./HoverDots";
import { LineLayer } from "./LineLayer";
import { MapLegend } from "./MapLegend";
import { type Mode, ModeChips } from "./ModeChips";

interface Props {
  comparison: Comparison;
  hoverIndex: number | null;
  zoom: Range | null;
}

/**
 * Track outline from GPS. "Delta" colours it by where the compared lap gains (green)
 * or loses (red) time; "Line" overlays both laps' GPS paths to compare the racing line.
 */
export function TrackMap({ comparison: c, hoverIndex, zoom }: Props) {
  const [mode, setMode] = useState<Mode>("delta");
  const geometry = useMemo(() => buildTrackGeometry(c), [c]);

  if (!geometry) return <div className="panel map empty">No GPS channels in this file.</div>;
  const { points, cmpPoints, gaps, segments, scale } = geometry;
  const lineMode = mode === "line" && cmpPoints != null;

  const n = points.length;
  const zoomIdx: Range | null = zoom
    ? [indexAt(zoom[0], c.track_length, n), indexAt(zoom[1], c.track_length, n)]
    : null;

  const viewBox =
    lineMode && zoomIdx
      ? lineViewBox(points, cmpPoints, zoomIdx, scale)
      : `0 0 ${SIZE} ${SIZE}`;

  const hover = hoverIndex != null ? points[hoverIndex] : null;
  const cmpHover = hoverIndex != null && cmpPoints ? cmpPoints[hoverIndex] : null;
  const gap = hoverIndex != null && gaps ? gaps[hoverIndex] : null;

  return (
    <div className="panel map">
      <ModeChips lineMode={lineMode} lineAvailable={cmpPoints != null} onChange={setMode} />
      <svg viewBox={viewBox} role="img" aria-label={`${c.track} track map`}>
        {lineMode ? (
          <LineLayer points={points} cmpPoints={cmpPoints} />
        ) : (
          <DeltaLayer
            points={points}
            segments={segments}
            zoomLo={zoomIdx?.[0] ?? null}
            zoomHi={zoomIdx?.[1] ?? null}
            comparison={c}
          />
        )}
        {hover && <HoverDots lineMode={lineMode} hover={hover} cmpHover={cmpHover} />}
        <circle cx={points[0][0]} cy={points[0][1]} r={5} fill="var(--text)" {...(lineMode ? PX : {})} />
      </svg>
      <MapLegend comparison={c} lineMode={lineMode} gap={gap} />
    </div>
  );
}
