import type { Comparison, TyreCorner } from "../../lib/types";
import type { Range } from "../../lib/range";
import { convertSpeed, convertTemp, type Units } from "../../lib/units";

export interface Row {
  d: number;
  delta: number;
  refSpeed: number;
  cmpSpeed: number;
  refThrottle?: number;
  cmpThrottle?: number;
  refBrake?: number;
  cmpBrake?: number;
  refSteer?: number;
  cmpSteer?: number;
  refGear?: number;
  cmpGear?: number;
  refTyre?: number;
  cmpTyre?: number;
}

const RAD_TO_DEG = 180 / Math.PI;

function tempAt(
  temps: Partial<Record<TyreCorner, number[]>> | null,
  corner: TyreCorner | undefined,
  i: number,
  units: Units,
): number | undefined {
  const v = corner && temps?.[corner]?.[i];
  return v == null ? undefined : convertTemp(v, units);
}

/** One row per grid point, with speeds and temperatures already in the display units. */
export function buildRows(c: Comparison, units: Units, tyre: TyreCorner | undefined): Row[] {
  return c.distance.map((d, i) => ({
    d,
    delta: c.delta[i],
    refSpeed: convertSpeed(c.ref_trace.speed[i], units),
    cmpSpeed: convertSpeed(c.cmp_trace.speed[i], units),
    refThrottle: c.ref_trace.throttle?.[i],
    cmpThrottle: c.cmp_trace.throttle?.[i],
    refBrake: c.ref_trace.brake?.[i],
    cmpBrake: c.cmp_trace.brake?.[i],
    refSteer: c.ref_trace.steering?.[i] != null ? c.ref_trace.steering[i] * RAD_TO_DEG : undefined,
    cmpSteer: c.cmp_trace.steering?.[i] != null ? c.cmp_trace.steering[i] * RAD_TO_DEG : undefined,
    refGear: c.ref_trace.gear?.[i],
    cmpGear: c.cmp_trace.gear?.[i],
    refTyre: tempAt(c.ref_trace.tyre_temp, tyre, i, units),
    cmpTyre: tempAt(c.cmp_trace.tyre_temp, tyre, i, units),
  }));
}

/** Y domain fitted to the rows inside the visible window, with a little headroom. */
export function fitDomain(rows: Row[], keys: (keyof Row)[], range: Range | null): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) {
    if (range && (r.d < range[0] || r.d > range[1])) continue;
    for (const k of keys) {
      const v = r[k];
      if (v == null) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo)) return [0, 1];
  const pad = (hi - lo) * 0.08 || 1;
  return [lo - pad, hi + pad];
}
