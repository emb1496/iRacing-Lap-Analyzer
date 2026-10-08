import { useMemo } from "react";
import { ReferenceLine } from "recharts";
import { CMP, REF } from "./chartDefaults";
import { fitDomain } from "./chartRows";
import { ChartFrame } from "./ChartFrame";
import { line, unitTooltip } from "./series";
import type { ChartProps } from "./types";

export function SteeringChart({ shared, showAxis }: ChartProps) {
  const { comparison: c, rows, zoom, units } = shared;
  // Symmetric about zero so left and right lock read the same.
  const domain = useMemo(() => {
    const [lo, hi] = fitDomain(rows, ["refSteer", "cmpSteer"], zoom);
    const m = Math.max(Math.abs(lo), Math.abs(hi));
    return [-m, m] as [number, number];
  }, [rows, zoom]);

  return (
    <ChartFrame
      shared={shared}
      title={
        <>
          Steering <small>(degrees at the wheel)</small>
        </>
      }
      height={140}
      showAxis={showAxis}
      yAxis={{ domain, allowDataOverflow: true, tickFormatter: (v: number) => String(Math.round(v)) }}
    >
      <ReferenceLine y={0} stroke="var(--grid-strong)" />
      {unitTooltip(units, "°")}
      {line("refSteer", REF, c.ref.label)}
      {line("cmpSteer", CMP, c.cmp.label)}
    </ChartFrame>
  );
}
