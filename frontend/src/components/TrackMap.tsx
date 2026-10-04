import { useMemo, useState } from "react";
import { formatShortDist, indexAt, type Range } from "../format";
import type { Comparison } from "../types";
import { useUnits } from "../units";

interface Props {
  comparison: Comparison;
  hoverIndex: number | null;
  zoom: Range | null;
}

type Mode = "delta" | "line";
type Point = [number, number];

const SIZE = 400;
const PAD = 24;
const M_PER_DEG = 111_320;
const CHUNK = 6; // grid points per coloured track segment
const MIN_VIEW_M = 40; // closest the line view zooms, so tiny spans don't magnify GPS noise

const path = (pts: Point[]) =>
  pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

/** Stroke widths stay in screen pixels when the line view's camera zooms. */
const PX = { vectorEffect: "non-scaling-stroke" } as const;

/**
 * Track outline from GPS. "Delta" colours it by where the compared lap gains (green)
 * or loses (red) time; "Line" overlays both laps' GPS paths to compare the racing line.
 */
export function TrackMap({ comparison: c, hoverIndex, zoom }: Props) {
  const { units } = useUnits();
  const [mode, setMode] = useState<Mode>("delta");

  const geometry = useMemo(() => {
    const { lat, lon } = c.ref_trace;
    if (!lat || !lon) return null;

    const lat0 = lat.reduce((a, b) => a + b, 0) / lat.length;
    const lon0 = lon.reduce((a, b) => a + b, 0) / lon.length;
    const cos = Math.cos((lat0 * Math.PI) / 180);
    const project = (la: number[], lo: number[]): Point[] =>
      lo.map((v, i) => [(v - lon0) * cos * M_PER_DEG, -(la[i] - lat0) * M_PER_DEG]);

    // Both laps share the reference's frame so their paths overlay exactly.
    const refM = project(lat, lon);
    const cmpM =
      c.cmp_trace.lat && c.cmp_trace.lon ? project(c.cmp_trace.lat, c.cmp_trace.lon) : null;
    const xs = refM.map((p) => p[0]);
    const ys = refM.map((p) => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
    const scale = (SIZE - 2 * PAD) / span;
    const offX = (SIZE - (Math.max(...xs) - minX) * scale) / 2;
    const offY = (SIZE - (Math.max(...ys) - minY) * scale) / 2;
    const toSvg = (pts: Point[]): Point[] =>
      pts.map(([x, y]) => [offX + (x - minX) * scale, offY + (y - minY) * scale]);
    const points = toSvg(refM);
    const cmpPoints = cmpM && toSvg(cmpM);
    // Metres between the two laps' positions at each grid point.
    const gaps = cmpM && refM.map(([x, y], i) => Math.hypot(x - cmpM[i][0], y - cmpM[i][1]));

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
      segments.push({ d: path(points.slice(i, j + 1)), color });
    }
    return { points, cmpPoints, gaps, segments, scale };
  }, [c]);

  if (!geometry) return <div className="panel map empty">No GPS channels in this file.</div>;
  const { points, cmpPoints, gaps, segments, scale } = geometry;
  const lineMode = mode === "line" && cmpPoints != null;

  const n = points.length;
  const zoomIdx: Range | null = zoom
    ? [indexAt(zoom[0], c.track_length, n), indexAt(zoom[1], c.track_length, n)]
    : null;

  // In line view, point the camera at the zoomed window so line differences are visible.
  let viewBox = `0 0 ${SIZE} ${SIZE}`;
  if (lineMode && zoomIdx) {
    const [a, b] = zoomIdx;
    const all = [...points.slice(a, b + 1), ...cmpPoints.slice(a, b + 1)];
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
    const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const view = Math.max(x1 - x0, y1 - y0, MIN_VIEW_M * scale) * 1.3;
    viewBox = `${(x0 + x1) / 2 - view / 2} ${(y0 + y1) / 2 - view / 2} ${view} ${view}`;
  }

  const hover = hoverIndex != null ? points[hoverIndex] : null;
  const gap = hoverIndex != null && gaps ? gaps[hoverIndex] : null;

  return (
    <div className="panel map">
      <div className="map-header">
        <div className="chips" role="group" aria-label="Map view">
          <button className="chip" aria-pressed={!lineMode} onClick={() => setMode("delta")}>
            Delta
          </button>
          <button
            className="chip"
            aria-pressed={lineMode}
            disabled={cmpPoints == null}
            onClick={() => setMode("line")}
          >
            Line
          </button>
        </div>
      </div>
      <svg viewBox={viewBox} role="img" aria-label={`${c.track} track map`}>
        {lineMode ? (
          <>
            <path d={path(points) + "Z"} stroke="var(--track-base)" strokeWidth={12} fill="none" strokeLinejoin="round" {...PX} />
            <path d={path(points)} stroke="var(--ref)" strokeWidth={2.5} fill="none" strokeLinejoin="round" {...PX} />
            <path d={path(cmpPoints)} stroke="var(--cmp)" strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeDasharray="6 4" {...PX} />
            {hover && hoverIndex != null && (
              <>
                <circle cx={cmpPoints[hoverIndex][0]} cy={cmpPoints[hoverIndex][1]} r={4} fill="var(--cmp)" stroke="var(--bg)" strokeWidth={1.5} {...PX} />
                <circle cx={hover[0]} cy={hover[1]} r={4} fill="var(--ref)" stroke="var(--bg)" strokeWidth={1.5} {...PX} />
              </>
            )}
          </>
        ) : (
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
            {hover && <circle cx={hover[0]} cy={hover[1]} r={7} className="hover-dot" />}
          </>
        )}
        <circle cx={points[0][0]} cy={points[0][1]} r={5} fill="var(--text)" {...(lineMode ? PX : {})} />
      </svg>
      {lineMode ? (
        <div className="legend">
          <span className="swatch ref" /> {c.ref.label}
          <span className="swatch cmp" /> {c.cmp.label}
          {gap != null && <span className="gap">Apart: {formatShortDist(gap, units)}</span>}
        </div>
      ) : (
        <div className="legend">
          <span className="swatch loss" /> {c.cmp.label} losing
          <span className="swatch gain" /> gaining
        </div>
      )}
    </div>
  );
}
