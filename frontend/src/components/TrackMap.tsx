import { useMemo } from "react";
import { indexAt, type Range } from "../format";
import type { Comparison } from "../types";

interface Props {
  comparison: Comparison;
  hoverIndex: number | null;
  zoom: Range | null;
}

const SIZE = 400;
const PAD = 24;
const M_PER_DEG = 111_320;
const CHUNK = 6; // grid points per coloured track segment

/**
 * Track outline from GPS, coloured by where the compared lap gains (green) or
 * loses (red) time against the reference.
 */
export function TrackMap({ comparison: c, hoverIndex, zoom }: Props) {
  const geometry = useMemo(() => {
    const { lat, lon } = c.ref_trace;
    if (!lat || !lon) return null;

    const lat0 = lat.reduce((a, b) => a + b, 0) / lat.length;
    const lon0 = lon.reduce((a, b) => a + b, 0) / lon.length;
    const cos = Math.cos((lat0 * Math.PI) / 180);
    const xs = lon.map((v) => (v - lon0) * cos * M_PER_DEG);
    const ys = lat.map((v) => -(v - lat0) * M_PER_DEG);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
    const scale = (SIZE - 2 * PAD) / span;
    const offX = (SIZE - (Math.max(...xs) - minX) * scale) / 2;
    const offY = (SIZE - (Math.max(...ys) - minY) * scale) / 2;
    const points = xs.map((x, i) => [offX + (x - minX) * scale, offY + (ys[i] - minY) * scale]);

    // Time gained or lost per metre over each chunk sets the colour.
    const step = c.distance[1] - c.distance[0];
    const segments = [];
    for (let i = 0; i < points.length - 1; i += CHUNK) {
      const j = Math.min(i + CHUNK, points.length - 1);
      const rate = (c.delta[j] - c.delta[i]) / ((j - i) * step); // s per metre
      const strength = Math.min(1, Math.abs(rate) / 0.002);
      const color =
        strength < 0.1
          ? "var(--neutral-track)"
          : rate > 0
            ? `rgba(255, 92, 92, ${0.3 + 0.7 * strength})`
            : `rgba(46, 204, 113, ${0.3 + 0.7 * strength})`;
      segments.push({
        d: points
          .slice(i, j + 1)
          .map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
          .join(""),
        color,
      });
    }
    return { points, segments };
  }, [c]);

  if (!geometry) return <div className="panel map empty">No GPS channels in this file.</div>;
  const { points, segments } = geometry;
  const hover = hoverIndex != null ? points[hoverIndex] : null;
  const zoomPath = zoom
    ? points
        .slice(indexAt(zoom[0], c.track_length, points.length), indexAt(zoom[1], c.track_length, points.length) + 1)
        .map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
        .join("")
    : null;

  return (
    <div className="panel map">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${c.track} track map`}>
        <path
          d={points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join("") + "Z"}
          stroke="var(--track-base)"
          strokeWidth={10}
          fill="none"
          strokeLinejoin="round"
        />
        {zoomPath && (
          <path d={zoomPath} stroke="var(--text)" strokeWidth={15} fill="none" strokeLinecap="round" opacity={0.85} />
        )}
        {segments.map((s, i) => (
          <path key={i} d={s.d} stroke={s.color} strokeWidth={5} fill="none" strokeLinecap="round" />
        ))}
        <circle cx={points[0][0]} cy={points[0][1]} r={5} fill="var(--text)" />
        {c.corners.map((corner) => {
          const [x, y] = points[indexAt(corner.apex, c.track_length, points.length)];
          return (
            <text key={corner.number} x={x + 8} y={y - 8} className="corner-label">
              T{corner.number}
            </text>
          );
        })}
        {hover && <circle cx={hover[0]} cy={hover[1]} r={7} className="hover-dot" />}
      </svg>
      <div className="legend">
        <span className="swatch loss" /> {c.cmp.label} losing
        <span className="swatch gain" /> gaining
      </div>
    </div>
  );
}
