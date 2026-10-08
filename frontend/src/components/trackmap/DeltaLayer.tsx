import { memo } from "react";
import { indexAt } from "../../lib/range";
import type { Comparison } from "../../lib/types";
import { type Point, path, type Segment } from "./geometry";

interface Props {
  points: Point[];
  segments: Segment[];
  zoomLo: number | null;
  zoomHi: number | null;
  comparison: Comparison;
}

/** Static delta-view track, zoom highlight and corner labels; memoised like LineLayer. */
export const DeltaLayer = memo(function DeltaLayer({
  points,
  segments,
  zoomLo,
  zoomHi,
  comparison: c,
}: Props) {
  const n = points.length;
  const zoomIdx = zoomLo != null && zoomHi != null ? [zoomLo, zoomHi] : null;
  return (
    <>
      <path d={path(points) + "Z"} stroke="var(--track-base)" strokeWidth={10} fill="none" strokeLinejoin="round" />
      {zoomIdx && (
        <path
          d={path(points.slice(zoomIdx[0], zoomIdx[1] + 1))}
          stroke="var(--text)"
          strokeWidth={15}
          fill="none"
          strokeLinecap="round"
          opacity={0.85}
        />
      )}
      {segments.map((s, i) => (
        <path key={i} d={s.d} stroke={s.color} strokeWidth={5} fill="none" strokeLinecap="round" />
      ))}
      {c.corners.map((corner) => {
        const [x, y] = points[indexAt(corner.apex, c.track_length, n)];
        return (
          <text key={corner.number} x={x + 8} y={y - 8} className="corner-label">
            T{corner.number}
          </text>
        );
      })}
    </>
  );
});
