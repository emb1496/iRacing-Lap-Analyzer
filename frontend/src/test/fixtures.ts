import type { Comparison, Conditions, Corner, SessionSummary, Trace } from "../lib/types";

const N = 11;
const range = (f: (i: number) => number) => Array.from({ length: N }, (_, i) => f(i));

export function makeTrace(over: Partial<Trace> = {}): Trace {
  return {
    time: range((i) => i),
    speed: range((i) => 100 + i),
    throttle: range((i) => i * 10),
    brake: range((i) => 100 - i * 10),
    gear: range((i) => 1 + (i % 4)),
    rpm: range(() => 5000),
    steering: range((i) => (i - 5) / 10),
    lat: range((i) => 50 + Math.sin(i) * 0.001),
    lon: range((i) => 5 + Math.cos(i) * 0.001),
    tyre_temp: {
      LF: range(() => 80),
      RF: range((i) => 85 + i),
      LR: range(() => 82),
      RR: range(() => 83),
    },
    ...over,
  };
}

export function makeConditions(over: Partial<Conditions> = {}): Conditions {
  const tyre = { inner: 80, middle: 85, outer: 90, pressure: 170 };
  return {
    track_temp: 30,
    air_temp: 20,
    wetness: 1,
    wind_speed: 10,
    humidity: 50,
    tyres: { LF: tyre, RF: { ...tyre, pressure: null }, LR: tyre, RR: tyre },
    ...over,
  };
}

export function makeCorner(over: Partial<Corner> = {}): Corner {
  return {
    number: 1,
    start: 100,
    apex: 150,
    end: 200,
    time_delta: 0.1,
    ref_min_speed: 80,
    cmp_min_speed: 75,
    ref_brake: 90,
    cmp_brake: 100,
    ref_peak_brake: 80,
    cmp_peak_brake: 70,
    ref_full_throttle: 210,
    cmp_full_throttle: 220,
    insight: { even: false, reasons: [{ kind: "brake_point", value: 10 }] },
    ...over,
  };
}

export function makeComparison(over: Partial<Comparison> = {}): Comparison {
  return {
    track: "Test Track",
    track_length: 1000,
    ref: { session_id: "s1", lap: 1, lap_time: 90.5, label: "Lap 1" },
    cmp: { session_id: "s1", lap: 2, lap_time: 91.25, label: "Lap 2" },
    distance: range((i) => i * 100),
    delta: range((i) => i * 0.1),
    ref_trace: makeTrace(),
    cmp_trace: makeTrace({ speed: range((i) => 95 + i) }),
    corners: [
      makeCorner(),
      makeCorner({ number: 2, apex: 600, start: 550, end: 650, time_delta: -0.05 }),
    ],
    ref_conditions: makeConditions(),
    cmp_conditions: makeConditions({ track_temp: 35 }),
    ...over,
  };
}

export function makeSession(over: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: "s1",
    filename: "a.ibt",
    track: "Test Track",
    car: "Car",
    driver: "Me",
    track_length: 1000,
    best_lap: 1,
    laps: [
      { number: 1, time: 90.5, valid: true },
      { number: 2, time: 91.25, valid: true },
      { number: 3, time: null, valid: false },
    ],
    ...over,
  };
}
