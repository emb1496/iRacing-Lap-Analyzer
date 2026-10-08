import { useMemo } from "react";
import { speedUnit } from "../../lib/units";
import { CMP, REF } from "./chartDefaults";
import { fitDomain } from "./chartRows";
import { ChartFrame } from "./ChartFrame";
import { line, unitTooltip } from "./series";
import type { ChartProps } from "./types";

export function SpeedChart({ shared, showAxis }: ChartProps) {
  const { comparison: c, rows, zoom, units } = shared;
  const domain = useMemo(() => fitDomain(rows, ["refSpeed", "cmpSpeed"], zoom), [rows, zoom]);

  return (
    <ChartFrame
      shared={shared}
      title="Speed"
      height={220}
      showAxis={showAxis}
      yAxis={{ domain, allowDataOverflow: true, tickFormatter: (v: number) => String(Math.round(v)) }}
    >
      {unitTooltip(units, speedUnit(units))}
      {line("refSpeed", REF, c.ref.label)}
      {line("cmpSpeed", CMP, c.cmp.label)}
    </ChartFrame>
  );
}
