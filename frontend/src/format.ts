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

export type Units = "metric" | "imperial";

const M_PER_MILE = 1609.344;
const FT_PER_M = 3.280839895;
const MPH_PER_KMH = 1 / 1.609344;

export function speedUnit(units: Units): string {
  return units === "imperial" ? "mph" : "km/h";
}

/** Speed in km/h converted to the display unit (no suffix). */
export function convertSpeed(kmh: number, units: Units): number {
  return units === "imperial" ? kmh * MPH_PER_KMH : kmh;
}

export function formatSpeed(kmh: number, units: Units): string {
  return `${Math.round(convertSpeed(kmh, units))} ${speedUnit(units)}`;
}

/** Short distances (brake points, throttle pickup): metres or feet. */
export function formatShortDist(m: number | null | undefined, units: Units): string {
  if (m == null) return "–";
  return units === "imperial" ? `${Math.round(m * FT_PER_M)} ft` : `${Math.round(m)} m`;
}

/** Long distances (lap axis): kilometres or miles. */
export function formatLongDist(m: number, units: Units): string {
  return units === "imperial"
    ? `${(m / M_PER_MILE).toFixed(2)} mi`
    : `${(m / 1000).toFixed(1)} km`;
}

/** Index into an evenly spaced distance grid closest to ``metres``. */
export function indexAt(metres: number, trackLength: number, points: number): number {
  return Math.min(points - 1, Math.max(0, Math.round((metres / trackLength) * (points - 1))));
}
