// Mirrors backend/lap_analyzer/schemas.py

export interface LapSummary {
  number: number;
  time: number | null;
  valid: boolean;
}

export interface SessionSummary {
  id: string;
  filename: string;
  track: string;
  car: string;
  driver: string;
  track_length: number;
  best_lap: number | null;
  laps: LapSummary[];
}

export interface LapSelection {
  sessionId: string;
  lap: number;
}

/** Which side of the comparison a lap pick applies to. */
export type Role = "ref" | "cmp";

export interface LapRef {
  session_id: string;
  lap: number;
  lap_time: number;
  label: string;
}

export type TyreCorner = "LF" | "RF" | "LR" | "RR";

export interface Trace {
  time: number[];
  speed: number[];
  throttle: number[] | null;
  brake: number[] | null;
  gear: number[] | null;
  rpm: number[] | null;
  steering: number[] | null;
  lat: number[] | null;
  lon: number[] | null;
  /** Mean tyre temperature (°C) per corner, when the file logs it. */
  tyre_temp: Record<TyreCorner, number[]> | null;
}

/** Signed, metric. See ``_explain`` in backend/lap_analyzer/analysis/compare.py for meanings. */
export interface Reason {
  kind: "brake_point" | "brake_new" | "brake_pressure" | "apex_speed" | "throttle_point";
  value: number | null;
}

export interface Insight {
  even: boolean;
  reasons: Reason[];
}

export interface Corner {
  number: number;
  start: number;
  apex: number;
  end: number;
  time_delta: number;
  ref_min_speed: number;
  cmp_min_speed: number;
  ref_brake: number | null;
  cmp_brake: number | null;
  ref_peak_brake: number;
  cmp_peak_brake: number;
  ref_full_throttle: number | null;
  cmp_full_throttle: number | null;
  insight: Insight;
}

export interface Comparison {
  track: string;
  track_length: number;
  ref: LapRef;
  cmp: LapRef;
  distance: number[];
  delta: number[];
  ref_trace: Trace;
  cmp_trace: Trace;
  corners: Corner[];
  ref_conditions: Conditions;
  cmp_conditions: Conditions;
}

/** Lap medians, metric. */
export interface TyreSummary {
  inner: number; // °C
  middle: number;
  outer: number;
  pressure: number | null; // kPa
}

/** Any scalar is null when the file did not log it. */
export interface Conditions {
  track_temp: number | null; // °C
  air_temp: number | null; // °C
  wetness: number | null; // 1 (dry) .. 7 (extremely wet)
  wind_speed: number | null; // km/h
  humidity: number | null; // %
  tyres: Partial<Record<TyreCorner, TyreSummary>>;
}
