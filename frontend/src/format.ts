export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null) return "--:--.---";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(3).padStart(6, "0")}`;
}

export function formatDelta(seconds: number, digits = 3): string {
  const sign = seconds > 0 ? "+" : seconds < 0 ? "−" : "±";
  return `${sign}${Math.abs(seconds).toFixed(digits)}`;
}

export function formatMetres(m: number | null | undefined): string {
  return m == null ? "–" : `${Math.round(m)} m`;
}

/** Index into an evenly spaced distance grid closest to ``metres``. */
export function indexAt(metres: number, trackLength: number, points: number): number {
  return Math.min(points - 1, Math.max(0, Math.round((metres / trackLength) * (points - 1))));
}
