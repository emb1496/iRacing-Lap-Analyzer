import { CMP, REF } from "./chartDefaults";
import { ChartFrame } from "./ChartFrame";
import { line, unitTooltip } from "./series";
import type { ChartProps } from "./types";

export function ThrottleChart({ shared, showAxis }: ChartProps) {
  const { comparison: c, units } = shared;
  return (
    <ChartFrame
      shared={shared}
      title="Throttle"
      height={110}
      showAxis={showAxis}
      yAxis={{ domain: [0, 100], ticks: [0, 50, 100] }}
    >
      {unitTooltip(units, "%")}
      {line("refThrottle", REF, c.ref.label)}
      {line("cmpThrottle", CMP, c.cmp.label)}
    </ChartFrame>
  );
}
