export type Range = [number, number];

/** Smallest span (metres) a brush selection may zoom to. */
export const MIN_ZOOM_SPAN = 60;

/** Index into an evenly spaced distance grid closest to ``metres``. */
export function indexAt(metres: number, trackLength: number, points: number): number {
  return Math.min(points - 1, Math.max(0, Math.round((metres / trackLength) * (points - 1))));
}

/** Distance window around a corner: its extent plus some run-in and run-out. */
export function cornerRange(
  corner: { start: number; end: number },
  trackLength: number,
): Range {
  const pad = Math.max(40, (corner.end - corner.start) * 0.5);
  return [Math.max(0, corner.start - pad), Math.min(trackLength, corner.end + pad)];
}
