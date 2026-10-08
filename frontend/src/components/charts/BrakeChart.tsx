import { area, unitTooltip } from "./series";
import { CMP, REF } from "./chartDefaults";
import { ChartFrame } from "./ChartFrame";
import type { ChartProps } from "./types";

export function BrakeChart({ shared, showAxis }: ChartProps) {
  const { comparison: c, units } = shared;
  return (
    <ChartFrame
      shared={shared}
      title="Brake"
      height={110}
      showAxis={showAxis}
      composed
      yAxis={{
        domain: [0, (max: number) => Math.max(20, Math.ceil(max / 10) * 10)],
        allowDataOverflow: true,
      }}
    >
      {unitTooltip(units, "%")}
      {area("refBrake", REF, c.ref.label)}
      {area("cmpBrake", CMP, c.cmp.label)}
    </ChartFrame>
  );
}
