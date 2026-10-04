import { formatDelta, formatShortDist, formatSpeed, type Units } from "./format";
import type { Corner, Reason } from "./types";

function describeReason(r: Reason, units: Units): string {
  const v = r.value ?? 0;
  switch (r.kind) {
    case "brake_point":
      return `braking ${formatShortDist(Math.abs(v), units)} ${v > 0 ? "earlier" : "later"}`;
    case "brake_new":
      return "braking where the reference lap didn't";
    case "brake_pressure":
      return `${Math.abs(v).toFixed(0)}% ${v < 0 ? "less" : "more"} brake pressure`;
    case "apex_speed":
      return `${formatSpeed(Math.abs(v), units)} ${v < 0 ? "slower" : "faster"} at the apex`;
    case "throttle_point":
      return `full throttle ${formatShortDist(Math.abs(v), units)} ${v > 0 ? "later" : "sooner"}`;
  }
}

/** Plain-English summary of a corner, without the "Turn N:" prefix. */
export function describeCorner(c: Corner, units: Units): string {
  if (c.insight.even) return "even.";
  const verb = c.time_delta > 0 ? "losing" : "gaining";
  const why = c.insight.reasons.length
    ? c.insight.reasons.map((r) => describeReason(r, units)).join(", ")
    : "no single obvious cause - compare the lines";
  return `${verb} ${formatDelta(Math.abs(c.time_delta), 2).slice(1)}s - ${why}.`;
}
