import type { Corner } from "./types";

/** The corner losing the most time, or undefined when there are no corners. */
export function worstCorner(corners: Corner[]): Corner | undefined {
  return corners.reduce<Corner | undefined>(
    (a, b) => (a == null || b.time_delta > a.time_delta ? b : a),
    undefined,
  );
}
