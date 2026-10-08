import type { Conditions, TyreCorner } from "../../lib/types";

export type Band = "inner" | "middle" | "outer";

/** Left-hand tyres have their outside edge on the left of the car, right-hand tyres on the right. */
export const BANDS: Record<"L" | "R", Band[]> = {
  L: ["outer", "middle", "inner"],
  R: ["inner", "middle", "outer"],
};

export const TYRE_GRID: TyreCorner[][] = [
  ["LF", "RF"],
  ["LR", "RR"],
];

/** Cool (blue) to hot (red) across the range of temperatures on screen. */
export const heat = (t: number) => `hsl(${Math.round(220 - 220 * t)} 62% 30%)`;

/** Corners for which both laps logged tyre temperatures. */
export function loggedTyreCorners(ref: Conditions, cmp: Conditions): TyreCorner[] {
  return TYRE_GRID.flat().filter((k) => ref.tyres[k] && cmp.tyres[k]);
}

/** Min and max surface temperature across every logged tyre, for the heat colour scale. */
export function tyreScale(ref: Conditions, cmp: Conditions): [number, number] {
  const temps = loggedTyreCorners(ref, cmp).flatMap((k) =>
    [ref.tyres[k], cmp.tyres[k]].flatMap((t) => [t!.inner, t!.middle, t!.outer]),
  );
  return [Math.min(...temps), Math.max(...temps)];
}
