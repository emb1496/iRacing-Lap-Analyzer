import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MouseHandlerDataParam } from "recharts";
import {
  convertSpeed,
  convertTemp,
  cornerRange,
  formatDelta,
  formatLongDist,
  formatShortDist,
  MIN_ZOOM_SPAN,
  type Range,
  speedUnit,
  tempUnit,
} from "../format";
import type { Comparison, TyreCorner } from "../types";
import { useUnits } from "../units";

interface Props {
  comparison: Comparison;
  onHover: (index: number | null) => void;
  /** Visible distance window in metres, or null for the whole lap. */
  zoom: Range | null;
  onZoom: (range: Range | null) => void;
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
  refSteer?: number;
  cmpSteer?: number;
  refGear?: number;
  cmpGear?: number;
  refTyre?: number;
  cmpTyre?: number;
}

const TYRE_CORNERS: TyreCorner[] = ["LF", "RF", "LR", "RR"];

const RAD_TO_DEG = 180 / Math.PI;

const REF = "var(--ref)";
const CMP = "var(--cmp)";

/** Y domain fitted to the rows inside the visible window, with a little headroom. */
function fitDomain(rows: Row[], keys: (keyof Row)[], range: Range | null): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) {
    if (range && (r.d < range[0] || r.d > range[1])) continue;
    for (const k of keys) {
      const v = r[k];
      if (v == null) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo)) return [0, 1];
  const pad = (hi - lo) * 0.08 || 1;
  return [lo - pad, hi + pad];
}

function tempAt(
  temps: Partial<Record<TyreCorner, number[]>> | null,
  corner: TyreCorner | undefined,
  i: number,
  units: "metric" | "imperial",
): number | undefined {
  const v = corner && temps?.[corner]?.[i];
  return v == null ? undefined : convertTemp(v, units);
}

export function TelemetryCharts({ comparison: c, onHover, zoom, onZoom }: Props) {
  const { units } = useUnits();
  // Brush selection in progress: distances (m) where the drag began and currently is.
  const [drag, setDragState] = useState<Range | null>(null);
  // Mirrors `drag` synchronously so a fast click's mouseup sees the mousedown.
  const dragRef = useRef<Range | null>(null);
  const setDrag = (r: Range | null) => {
    dragRef.current = r;
    setDragState(r);
  };
  const tyreCorners = TYRE_CORNERS.filter(
    (k) => c.ref_trace.tyre_temp?.[k] && c.cmp_trace.tyre_temp?.[k],
  );
  const [tyre, setTyre] = useState<TyreCorner>("RF");
  const shownTyre = tyreCorners.includes(tyre) ? tyre : tyreCorners[0];
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
        refSteer: c.ref_trace.steering?.[i] != null ? c.ref_trace.steering[i] * RAD_TO_DEG : undefined,
        cmpSteer: c.cmp_trace.steering?.[i] != null ? c.cmp_trace.steering[i] * RAD_TO_DEG : undefined,
        refGear: c.ref_trace.gear?.[i],
        cmpGear: c.cmp_trace.gear?.[i],
        refTyre: tempAt(c.ref_trace.tyre_temp, shownTyre, i, units),
        cmpTyre: tempAt(c.cmp_trace.tyre_temp, shownTyre, i, units),
      })),
    [c, units, shownTyre],
  );

  const indexOf = (state: MouseHandlerDataParam): number | null => {
    const i = state.activeTooltipIndex;
    return typeof i === "number" ? i : i != null ? Number(i) : null;
  };

  const commitDrag = () => {
    const d = dragRef.current;
    if (d) {
      const lo = Math.min(...d);
      const hi = Math.max(...d);
      if (hi - lo >= MIN_ZOOM_SPAN) onZoom([lo, hi]);
    }
    setDrag(null);
  };

  // A drag released outside the chart still ends the brush.
  useEffect(() => {
    if (!drag) return;
    window.addEventListener("mouseup", commitDrag);
    return () => window.removeEventListener("mouseup", commitDrag);
  });

  const shared = {
    data: rows,
    syncId: "lap",
    margin: { top: 8, right: 16, bottom: 0, left: 0 },
    onMouseDown: (state: MouseHandlerDataParam) => {
      const i = indexOf(state);
      if (i != null) setDrag([rows[i].d, rows[i].d]);
    },
    onMouseMove: (state: MouseHandlerDataParam) => {
      const i = indexOf(state);
      onHover(i);
      if (dragRef.current && i != null) setDrag([dragRef.current[0], rows[i].d]);
    },
    onMouseLeave: () => onHover(null),
  };

  const domain: Range = zoom ?? [0, c.track_length];
  const speedDomain = useMemo(
    () => fitDomain(rows, ["refSpeed", "cmpSpeed"], zoom),
    [rows, zoom],
  );
  const deltaDomain = useMemo(() => fitDomain(rows, ["delta"], zoom), [rows, zoom]);
  const brush = drag && drag[0] !== drag[1] && (
    <ReferenceArea x1={drag[0]} x2={drag[1]} fill="var(--text)" fillOpacity={0.12} stroke="none" />
  );

  const xAxis = (show: boolean) => (
    <XAxis
      dataKey="d"
      type="number"
      domain={domain}
      allowDataOverflow
      hide={!show}
      tickFormatter={(m: number) =>
        domain[1] - domain[0] < 2000 ? formatShortDist(m, units) : formatLongDist(m, units)
      }
      stroke="var(--muted)"
    />
  );

  const visibleCorners = c.corners.filter(
    (corner) => corner.apex >= domain[0] && corner.apex <= domain[1],
  );
  const corners = visibleCorners.map((corner) => (
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

  const line = (key: keyof Row, color: string, name: string, dashed = false, step = false) => (
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

  const area = (key: keyof Row, color: string, name: string) => (
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

  const hasPedals =!!(c.ref_trace.throttle && c.ref_trace.brake);
  const hasSteering = !!(c.ref_trace.steering && c.cmp_trace.steering);
  const hasGear = !!(c.ref_trace.gear && c.cmp_trace.gear);
  // Only the bottom-most chart shows the distance axis.
  const hasTyres = tyreCorners.length > 0;
  const axisOn = hasTyres
    ? "tyre"
    : hasGear
      ? "gear"
      : hasSteering
        ? "steer"
        : hasPedals
          ? "pedals"
          : "speed";
  const tyreDomain = useMemo(
    () => fitDomain(rows, ["refTyre", "cmpTyre"], zoom),
    [rows, zoom],
  );
  const steerDomain = useMemo(() => {
    const [lo, hi] = fitDomain(rows, ["refSteer", "cmpSteer"], zoom);
    const m = Math.max(Math.abs(lo), Math.abs(hi));
    return [-m, m] as [number, number];
  }, [rows, zoom]);
  const gearDomain = useMemo(() => {
    const [lo, hi] = fitDomain(rows, ["refGear", "cmpGear"], zoom);
    return [Math.max(0, Math.floor(lo + 0.5)), Math.ceil(hi - 0.5)] as [number, number];
  }, [rows, zoom]);

  return (
    <div
      className={`charts${drag ? " brushing" : ""}`}
      onDoubleClick={() => onZoom(null)}
      onMouseUp={commitDrag}
    >
      <div className="zoom-bar">
        <span className="hint">
          {zoom
            ? `Showing ${formatShortDist(zoom[0], units)} – ${formatShortDist(zoom[1], units)}`
            : "Drag on any chart to zoom"}
        </span>
        <div className="chips" role="group" aria-label="Zoom to corner">
          {c.corners.map((corner) => {
            const [lo, hi] = cornerRange(corner, c.track_length);
            const active = zoom != null && zoom[0] === lo && zoom[1] === hi;
            return (
              <button
                key={corner.number}
                className="chip"
                aria-pressed={active}
                onClick={() => onZoom(active ? null : [lo, hi])}
              >
                T{corner.number}
              </button>
            );
          })}
        </div>
        <button className="chip" disabled={!zoom} onClick={() => onZoom(null)}>
          Reset zoom
        </button>
      </div>
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
            domain={deltaDomain}
            allowDataOverflow
            tickFormatter={(v: number) => formatDelta(v, 1)}
          />
          {corners}
          {visibleCorners.map((corner) => (
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
          {brush}
        </LineChart>
      </ResponsiveContainer>

      <h3>Speed</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart {...shared}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          {xAxis(axisOn === "speed")}
          <YAxis
            width={48}
            stroke="var(--muted)"
            domain={speedDomain}
            allowDataOverflow
            tickFormatter={(v: number) => String(Math.round(v))}
          />
          {corners}
          {tooltip(speedUnit(units))}
          {line("refSpeed", REF, c.ref.label)}
          {line("cmpSpeed", CMP, c.cmp.label)}
          {brush}
        </LineChart>
      </ResponsiveContainer>

      {hasPedals && (
        <>
          <h3>Throttle</h3>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart {...shared}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              {xAxis(false)}
              <YAxis width={48} stroke="var(--muted)" domain={[0, 100]} ticks={[0, 50, 100]} />
              {corners}
              {tooltip("%")}
              {line("refThrottle", REF, c.ref.label)}
              {line("cmpThrottle", CMP, c.cmp.label)}
              {brush}
            </LineChart>
          </ResponsiveContainer>

          <h3>Brake</h3>
          <ResponsiveContainer width="100%" height={110}>
            <ComposedChart {...shared}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              {xAxis(axisOn === "pedals")}
              <YAxis
                width={48}
                stroke="var(--muted)"
                domain={[0, (max: number) => Math.max(20, Math.ceil(max / 10) * 10)]}
                allowDataOverflow
              />
              {corners}
              {tooltip("%")}
              {area("refBrake", REF, c.ref.label)}
              {area("cmpBrake", CMP, c.cmp.label)}
              {brush}
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}

      {hasSteering && (
        <>
          <h3>
            Steering <small>(degrees at the wheel)</small>
          </h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart {...shared}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              {xAxis(axisOn === "steer")}
              <YAxis
                width={48}
                stroke="var(--muted)"
                domain={steerDomain}
                allowDataOverflow
                tickFormatter={(v: number) => String(Math.round(v))}
              />
              {corners}
              <ReferenceLine y={0} stroke="var(--grid-strong)" />
              {tooltip("°")}
              {line("refSteer", REF, c.ref.label)}
              {line("cmpSteer", CMP, c.cmp.label)}
              {brush}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      {hasGear && (
        <>
          <h3>Gear</h3>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart {...shared}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              {xAxis(axisOn === "gear")}
              <YAxis
                width={48}
                stroke="var(--muted)"
                domain={gearDomain}
                allowDataOverflow
                allowDecimals={false}
                interval={0}
              />
              {corners}
              {tooltip("")}
              {line("refGear", REF, c.ref.label, false, true)}
              {line("cmpGear", CMP, c.cmp.label, true, true)}
              {brush}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      {hasTyres && (
        <>
          <h3 className="chart-title">
            <span>
              Tyre temperature <small>(mean of inner, middle and outer)</small>
            </span>
            <span className="chips" role="group" aria-label="Tyre">
              {tyreCorners.map((k) => (
                <button
                  key={k}
                  className="chip"
                  aria-pressed={k === shownTyre}
                  onClick={() => setTyre(k)}
                >
                  {k}
                </button>
              ))}
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart {...shared}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              {xAxis(axisOn === "tyre")}
              <YAxis
                width={48}
                stroke="var(--muted)"
                domain={tyreDomain}
                allowDataOverflow
                tickFormatter={(v: number) => String(Math.round(v))}
              />
              {corners}
              {tooltip(tempUnit(units), 1)}
              {line("refTyre", REF, c.ref.label)}
              {line("cmpTyre", CMP, c.cmp.label)}
              {brush}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
