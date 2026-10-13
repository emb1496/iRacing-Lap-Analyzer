export type Units = "metric" | "imperial";

const M_PER_MILE = 1609.344;
const FT_PER_M = 3.280839895;
const MPH_PER_KMH = 1 / 1.609344;
const PSI_PER_KPA = 0.1450377;

export function speedUnit(units: Units): string {
  return units === "imperial" ? "mph" : "km/h";
}

/** Speed in km/h converted to the display unit (no suffix). */
export function convertSpeed(kmh: number, units: Units): number {
  return units === "imperial" ? kmh * MPH_PER_KMH : kmh;
}

export function tempUnit(units: Units): string {
  return units === "imperial" ? "°F" : "°C";
}

export function convertTemp(c: number, units: Units): number {
  return units === "imperial" ? (c * 9) / 5 + 32 : c;
}

/** A temperature *difference*: scales but does not offset. */
export function convertTempDelta(c: number, units: Units): number {
  return units === "imperial" ? (c * 9) / 5 : c;
}

export function pressureUnit(units: Units): string {
  return units === "imperial" ? "psi" : "kPa";
}

export function convertPressure(kpa: number, units: Units): number {
  return units === "imperial" ? kpa * PSI_PER_KPA : kpa;
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
