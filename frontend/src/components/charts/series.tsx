import { Area, Line, ReferenceLine, Tooltip } from "recharts";
import type { Corner } from "../../lib/types";
import { formatShortDist, type Units } from "../../lib/units";
import type { Row } from "./chartRows";
import { TOOLTIP_STYLE } from "./chartDefaults";

// These return elements rather than being components: Recharts reads its children directly.

export function line(key: keyof Row, color: string, name: string, dashed = false, step = false) {
  return (
    <Line
      dataKey={key}
      name={name}
      type={step ? "stepAfter" : "linear"}
      stroke={color}
      dot={false}
      strokeWidth={1.5}
      strokeDasharray={dashed ? "4 3" : undefined}
      isAnimationActive={false}
    />
  );
}

export function area(key: keyof Row, color: string, name: string) {
  return (
    <Area
      dataKey={key}
      name={name}
      type="linear"
      stroke={color}
      fill={color}
      fillOpacity={0.18}
      dot={false}
      strokeWidth={1.5}
      isAnimationActive={false}
    />
  );
}

export function cornerLines(corners: Corner[]) {
  return corners.map((corner) => (
    <ReferenceLine
      key={corner.number}
      x={corner.apex}
      stroke="var(--grid-strong)"
      strokeDasharray="2 4"
    />
  ));
}

/** Tooltip with the distance as its label and a custom value formatter. */
export function chartTooltip(units: Units, formatter: (v: number) => string) {
  return (
    <Tooltip
      contentStyle={TOOLTIP_STYLE}
      labelFormatter={(m) => formatShortDist(Number(m), units)}
      formatter={(v) => formatter(Number(v))}
      isAnimationActive={false}
    />
  );
}

/** Tooltip showing ``value unit`` to a fixed number of digits. */
export function unitTooltip(units: Units, unit: string, digits = 0) {
  return chartTooltip(units, (v) => `${v.toFixed(digits)} ${unit}`);
}
