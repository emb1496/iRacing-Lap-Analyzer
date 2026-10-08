import { useMemo } from "react";
import { ReferenceLine } from "recharts";
import { formatDelta } from "../../lib/format";
import { fitDomain } from "./chartRows";
import { ChartFrame } from "./ChartFrame";
import { chartTooltip, line } from "./series";
import type { ChartProps } from "./types";

export function DeltaChart({ shared, showAxis }: ChartProps) {
  const { comparison: c, rows, zoom, units, visibleCorners } = shared;
  const domain = useMemo(() => fitDomain(rows, ["delta"], zoom), [rows, zoom]);

  return (
    <ChartFrame
      shared={shared}
      title={
        <>
          Time delta <small>(above zero: {c.cmp.label} is behind)</small>
        </>
      }
      height={150}
      showAxis={showAxis}
      yAxis={{ domain, allowDataOverflow: true, tickFormatter: (v: number) => formatDelta(v, 1) }}
    >
      {visibleCorners.map((corner) => (
        <ReferenceLine
          key={`label-${corner.number}`}
          x={corner.apex}
          stroke="none"
          label={{ value: `T${corner.number}`, position: "insideTop", fill: "var(--muted)" }}
        />
      ))}
      <ReferenceLine y={0} stroke="var(--grid-strong)" />
      {chartTooltip(units, (v) => `${formatDelta(v)} s`)}
      {line("delta", "var(--text)", "Delta")}
    </ChartFrame>
  );
}
