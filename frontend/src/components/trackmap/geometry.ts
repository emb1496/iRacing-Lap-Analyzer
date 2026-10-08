import type { Range } from "../../lib/range";
import type { Comparison } from "../../lib/types";

export type Point = [number, number];

export interface Segment {
  d: string;
  color: string;
}

export interface TrackGeometry {
  points: Point[];
  cmpPoints: Point[] | null;
  gaps: number[] | null;
  segments: Segment[];
  scale: number;
}

export const SIZE = 400;
const PAD = 24;
const M_PER_DEG = 111_320;
const CHUNK = 6; // grid points per coloured track segment
const MIN_VIEW_M = 40; // closest the line view zooms, so tiny spans don't magnify GPS noise

export const path = (pts: Point[]) =>
  pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

/** Project both laps' GPS into a shared SVG frame and colour the track by time gained or lost. */
export function buildTrackGeometry(c: Comparison): TrackGeometry | null {
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
  const segments: Segment[] = [];
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
}

/** Line-view camera: frames the zoomed window of both laps so line differences are visible. */
export function lineViewBox(
  points: Point[],
  cmpPoints: Point[],
  [a, b]: Range,
  scale: number,
): string {
  const all = [...points.slice(a, b + 1), ...cmpPoints.slice(a, b + 1)];
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const view = Math.max(x1 - x0, y1 - y0, MIN_VIEW_M * scale) * 1.3;
  return `${(x0 + x1) / 2 - view / 2} ${(y0 + y1) / 2 - view / 2} ${view} ${view}`;
}
