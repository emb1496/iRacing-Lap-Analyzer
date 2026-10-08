import { buildRows } from "../components/charts/chartRows";
import type { ChartShared } from "../components/charts/types";
import { makeComparison } from "./fixtures";

export function makeShared(over: Partial<ChartShared> = {}): ChartShared {
  const comparison = makeComparison();
  return {
    comparison,
    rows: buildRows(comparison, "metric", "RF"),
    units: "metric",
    domain: [0, 1000],
    zoom: null,
    visibleCorners: comparison.corners,
    handlers: { onMouseDown: jest.fn(), onMouseMove: jest.fn(), onMouseLeave: jest.fn() },
    ...over,
  };
}
