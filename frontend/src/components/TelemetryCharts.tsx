import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MouseHandlerDataParam } from "recharts";
import { convertSpeed, formatDelta, formatLongDist, formatShortDist, speedUnit } from "../format";
import type { Comparison } from "../types";
import { useUnits } from "../units";

interface Props {
  comparison: Comparison;
  onHover: (index: number | null) => void;
}

interface Row {
  d: number;
  delta: number;
  refSpeed: number;
  cmpSpeed: number;
  refThrottle?: number;
  cmpThrottle?: number;
  refBrake?: number;
  cmpBrake?: number;
}

const REF = "var(--ref)";
const CMP = "var(--cmp)";

export function TelemetryCharts({ comparison: c, onHover }: Props) {
  const { units } = useUnits();
  const rows = useMemo<Row[]>(
    () =>
      c.distance.map((d, i) => ({
        d,
        delta: c.delta[i],
        refSpeed: convertSpeed(c.ref_trace.speed[i], units),
        cmpSpeed: convertSpeed(c.cmp_trace.speed[i], units),
        refThrottle: c.ref_trace.throttle?.[i],
        cmpThrottle: c.cmp_trace.throttle?.[i],
        refBrake: c.ref_trace.brake?.[i],
        cmpBrake: c.cmp_trace.brake?.[i],
      })),
    [c, units],
  );

  const handleMove = (state: MouseHandlerDataParam) => {
    const i = state.activeTooltipIndex;
    onHover(typeof i === "number" ? i : i != null ? Number(i) : null);
  };

  const shared = {
    data: rows,
    syncId: "lap",
    margin: { top: 8, right: 16, bottom: 0, left: 0 },
    onMouseMove: handleMove,
    onMouseLeave: () => onHover(null),
  };

  const xAxis = (show: boolean) => (
    <XAxis
      dataKey="d"
      type="number"
      domain={[0, c.track_length]}
      hide={!show}
      tickFormatter={(m: number) => formatLongDist(m, units)}
      stroke="var(--muted)"
    />
  );

  const corners = c.corners.map((corner) => (
    <ReferenceLine
      key={corner.number}
      x={corner.apex}
      stroke="var(--grid-strong)"
      strokeDasharray="2 4"
    />
  ));

  const tooltip = (unit: string, digits = 0) => (
    <Tooltip
      contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)" }}
      labelFormatter={(m) => formatShortDist(Number(m), units)}
      formatter={(v) => `${Number(v).toFixed(digits)} ${unit}`}
      isAnimationActive={false}
    />
  );

  const line = (key: keyof Row, color: string, name: string, dashed = false) => (
    <Line
      dataKey={key}
      name={name}
      stroke={color}
      dot={false}
      strokeWidth={1.5}
      strokeDasharray={dashed ? "4 3" : undefined}
      isAnimationActive={false}
    />
  );

  const hasPedals = c.ref_trace.throttle && c.ref_trace.brake;

  return (
    <div className="charts">
      <h3>
        Time delta <small>(above zero: {c.cmp.label} is behind)</small>
      </h3>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart {...shared}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          {xAxis(false)}
          <YAxis
            width={48}
            stroke="var(--muted)"
            tickFormatter={(v: number) => formatDelta(v, 1)}
          />
          {corners}
          {c.corners.map((corner) => (
            <ReferenceLine
              key={`label-${corner.number}`}
              x={corner.apex}
              stroke="none"
              label={{ value: `T${corner.number}`, position: "insideTop", fill: "var(--muted)" }}
            />
          ))}
          <ReferenceLine y={0} stroke="var(--grid-strong)" />
          <Tooltip
            contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)" }}
            labelFormatter={(m) => formatShortDist(Number(m), units)}
            formatter={(v) => `${formatDelta(Number(v))} s`}
            isAnimationActive={false}
          />
          {line("delta", "var(--text)", "Delta")}
        </LineChart>
      </ResponsiveContainer>

      <h3>Speed</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart {...shared}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          {xAxis(!hasPedals)}
          <YAxis width={48} stroke="var(--muted)" unit="" />
          {corners}
          {tooltip(speedUnit(units))}
          {line("refSpeed", REF, c.ref.label)}
          {line("cmpSpeed", CMP, c.cmp.label)}
        </LineChart>
      </ResponsiveContainer>

      {hasPedals && (
        <>
          <h3>Throttle &amp; brake</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart {...shared}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              {xAxis(true)}
              <YAxis width={48} stroke="var(--muted)" domain={[0, 100]} />
              {corners}
              {tooltip("%")}
              {line("refThrottle", REF, `${c.ref.label} throttle`)}
              {line("cmpThrottle", CMP, `${c.cmp.label} throttle`)}
              {line("refBrake", REF, `${c.ref.label} brake`, true)}
              {line("cmpBrake", CMP, `${c.cmp.label} brake`, true)}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
