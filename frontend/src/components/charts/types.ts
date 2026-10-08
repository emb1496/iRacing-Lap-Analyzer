import type { MouseHandlerDataParam } from "recharts";
import type { Range } from "../../lib/range";
import type { Comparison, Corner } from "../../lib/types";
import type { Units } from "../../lib/units";
import type { Row } from "./chartRows";

/** Everything the individual charts have in common, built once by TelemetryCharts. */
export interface ChartShared {
  comparison: Comparison;
  rows: Row[];
  units: Units;
  /** Visible distance window in metres. */
  domain: Range;
  /** The zoom the user chose, or null for the whole lap (drives the y-domain fit). */
  zoom: Range | null;
  /** Corners whose apex is inside the visible window. */
  visibleCorners: Corner[];
  handlers: {
    onMouseDown: (state: MouseHandlerDataParam) => void;
    onMouseMove: (state: MouseHandlerDataParam) => void;
    onMouseLeave: () => void;
  };
}

export interface ChartProps {
  shared: ChartShared;
  /** Only the bottom-most chart shows the distance axis. */
  showAxis: boolean;
}
