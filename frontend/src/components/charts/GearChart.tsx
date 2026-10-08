import { useMemo } from "react";
import { CMP, REF } from "./chartDefaults";
import { fitDomain } from "./chartRows";
import { ChartFrame } from "./ChartFrame";
import { line, unitTooltip } from "./series";
import type { ChartProps } from "./types";

export function GearChart({ shared, showAxis }: ChartProps) {
  const { comparison: c, rows, zoom, units } = shared;
  // Whole gears only.
  const domain = useMemo(() => {
    const [lo, hi] = fitDomain(rows, ["refGear", "cmpGear"], zoom);
    return [Math.max(0, Math.floor(lo + 0.5)), Math.ceil(hi - 0.5)] as [number, number];
  }, [rows, zoom]);

  return (
    <ChartFrame
      shared={shared}
      title="Gear"
      height={110}
      showAxis={showAxis}
      yAxis={{ domain, allowDataOverflow: true, allowDecimals: false, interval: 0 }}
    >
      {unitTooltip(units, "")}
      {line("refGear", REF, c.ref.label, false, true)}
      {line("cmpGear", CMP, c.cmp.label, true, true)}
    </ChartFrame>
  );
}
