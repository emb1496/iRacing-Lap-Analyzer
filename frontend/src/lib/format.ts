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

/** iRacing's irsdk_TrackWetness, indexed by value. */
export const WETNESS_LABELS = [
  "Unknown",
  "Dry",
  "Mostly dry",
  "Very lightly wet",
  "Lightly wet",
  "Moderately wet",
  "Very wet",
  "Extremely wet",
];
