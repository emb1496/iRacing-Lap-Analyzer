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

export interface LapRef {
  session_id: string;
  lap: number;
  lap_time: number;
  label: string;
}

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
  insight: string;
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
}
