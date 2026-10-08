import { WETNESS_LABELS } from "../../lib/format";
import type { Conditions } from "../../lib/types";
import {
  convertSpeed,
  convertTemp,
  convertTempDelta,
  speedUnit,
  tempUnit,
  type Units,
} from "../../lib/units";

export interface Metric {
  label: string;
  /** Fixed scale for the dumbbell, in metric units. */
  range: [number, number];
  get: (c: Conditions) => number | null;
  show: (v: number, units: Units) => string;
  showDelta: (d: number, units: Units) => string;
}

export const signed = (n: number, digits = 0) => {
  const r = Number(n.toFixed(digits));
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r).toFixed(digits)}`;
};

export const METRICS: Metric[] = [
  {
    label: "Track temp",
    range: [0, 60],
    get: (c) => c.track_temp,
    show: (v, u) => `${Math.round(convertTemp(v, u))}${tempUnit(u)}`,
    showDelta: (d, u) => `${signed(convertTempDelta(d, u))}${tempUnit(u)}`,
  },
  {
    label: "Air temp",
    range: [0, 45],
    get: (c) => c.air_temp,
    show: (v, u) => `${Math.round(convertTemp(v, u))}${tempUnit(u)}`,
    showDelta: (d, u) => `${signed(convertTempDelta(d, u))}${tempUnit(u)}`,
  },
  {
    label: "Track wetness",
    range: [1, 7],
    get: (c) => c.wetness,
    show: (v) => WETNESS_LABELS[Math.round(v)] ?? "Unknown",
    showDelta: (d) => (d === 0 ? "same" : d > 0 ? "wetter" : "drier"),
  },
  {
    label: "Wind",
    range: [0, 40],
    get: (c) => c.wind_speed,
    show: (v, u) => `${Math.round(convertSpeed(v, u))} ${speedUnit(u)}`,
    showDelta: (d, u) => `${signed(convertSpeed(d, u))} ${speedUnit(u)}`,
  },
  {
    label: "Humidity",
    range: [0, 100],
    get: (c) => c.humidity,
    show: (v) => `${Math.round(v)}%`,
    showDelta: (d) => `${signed(d)}%`,
  },
];

/** Differences big enough that the lap-time gap should be read with them in mind. */
export function conditionNotes(ref: Conditions, cmp: Conditions, units: Units): string[] {
  const notes: string[] = [];
  if (ref.track_temp != null && cmp.track_temp != null) {
    const d = cmp.track_temp - ref.track_temp;
    if (Math.abs(d) >= 2) {
      const t = Math.round(Math.abs(convertTempDelta(d, units)));
      notes.push(`Track was ${t}${tempUnit(units)} ${d < 0 ? "cooler" : "warmer"} on the compared lap`);
    }
  }
  if (ref.wetness != null && cmp.wetness != null && ref.wetness !== cmp.wetness) {
    notes.push(
      `Surface was ${(WETNESS_LABELS[cmp.wetness] ?? "unknown").toLowerCase()} on the compared lap, ` +
        `${(WETNESS_LABELS[ref.wetness] ?? "unknown").toLowerCase()} on the reference`,
    );
  }
  if (ref.wind_speed != null && cmp.wind_speed != null) {
    const d = cmp.wind_speed - ref.wind_speed;
    if (Math.abs(d) >= 8) {
      const w = Math.round(Math.abs(convertSpeed(d, units)));
      notes.push(`Wind was ${w} ${speedUnit(units)} ${d < 0 ? "lighter" : "stronger"} on the compared lap`);
    }
  }
  return notes;
}

/** Position (0..1) of ``v`` on a metric's fixed scale. */
export const along = (v: number, [lo, hi]: [number, number]) =>
  Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
