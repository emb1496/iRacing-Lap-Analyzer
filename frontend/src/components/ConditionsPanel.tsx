import {
  convertPressure,
  convertSpeed,
  convertTemp,
  convertTempDelta,
  pressureUnit,
  speedUnit,
  tempUnit,
  type Units,
  WETNESS_LABELS,
} from "../format";
import type { Comparison, Conditions, TyreCorner, TyreSummary } from "../types";
import { useUnits } from "../units";

interface Props {
  comparison: Comparison;
}

interface Metric {
  label: string;
  /** Fixed scale for the dumbbell, in metric units. */
  range: [number, number];
  get: (c: Conditions) => number | null;
  show: (v: number, units: Units) => string;
  showDelta: (d: number, units: Units) => string;
}

const signed = (n: number, digits = 0) => {
  const r = Number(n.toFixed(digits));
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r).toFixed(digits)}`;
};

const METRICS: Metric[] = [
  {
    label: "Track temp",
    range: [0, 60],
    get: (c) => c.track_temp,
    show: (v, u) => `${Math.round(convertTemp(v, u))}${tempUnit(u)}`,
    showDelta: (d, u) => `${signed(convertTempDelta(d, u))}${tempUnit(u)}`,
  },
  {
    label: "Air temp",
    range: [0, 45],
    get: (c) => c.air_temp,
    show: (v, u) => `${Math.round(convertTemp(v, u))}${tempUnit(u)}`,
    showDelta: (d, u) => `${signed(convertTempDelta(d, u))}${tempUnit(u)}`,
  },
  {
    label: "Track wetness",
    range: [1, 7],
    get: (c) => c.wetness,
    show: (v) => WETNESS_LABELS[Math.round(v)] ?? "Unknown",
    showDelta: (d) => (d === 0 ? "same" : d > 0 ? "wetter" : "drier"),
  },
  {
    label: "Wind",
    range: [0, 40],
    get: (c) => c.wind_speed,
    show: (v, u) => `${Math.round(convertSpeed(v, u))} ${speedUnit(u)}`,
    showDelta: (d, u) => `${signed(convertSpeed(d, u))} ${speedUnit(u)}`,
  },
  {
    label: "Humidity",
    range: [0, 100],
    get: (c) => c.humidity,
    show: (v) => `${Math.round(v)}%`,
    showDelta: (d) => `${signed(d)}%`,
  },
];

/** Differences big enough that the lap-time gap should be read with them in mind. */
export function conditionNotes(ref: Conditions, cmp: Conditions, units: Units): string[] {
  const notes: string[] = [];
  if (ref.track_temp != null && cmp.track_temp != null) {
    const d = cmp.track_temp - ref.track_temp;
    if (Math.abs(d) >= 2) {
      const t = Math.round(Math.abs(convertTempDelta(d, units)));
      notes.push(`Track was ${t}${tempUnit(units)} ${d < 0 ? "cooler" : "warmer"} on the compared lap`);
    }
  }
  if (ref.wetness != null && cmp.wetness != null && ref.wetness !== cmp.wetness) {
    notes.push(
      `Surface was ${(WETNESS_LABELS[cmp.wetness] ?? "unknown").toLowerCase()} on the compared lap, ` +
        `${(WETNESS_LABELS[ref.wetness] ?? "unknown").toLowerCase()} on the reference`,
    );
  }
  if (ref.wind_speed != null && cmp.wind_speed != null) {
    const d = cmp.wind_speed - ref.wind_speed;
    if (Math.abs(d) >= 8) {
      const w = Math.round(Math.abs(convertSpeed(d, units)));
      notes.push(`Wind was ${w} ${speedUnit(units)} ${d < 0 ? "lighter" : "stronger"} on the compared lap`);
    }
  }
  return notes;
}

/** Position (0..1) of ``v`` on a metric's fixed scale. */
const along = (v: number, [lo, hi]: [number, number]) =>
  Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

function Dumbbell({ metric, a: refValue, b: cmpValue }: { metric: Metric; a: number; b: number }) {
  const a = along(refValue, metric.range) * 100;
  const b = along(cmpValue, metric.range) * 100;
  return (
    <div className="dumbbell" aria-hidden>
      <span className="bar" style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(a - b)}%` }} />
      <span className="dot ref" style={{ left: `${a}%` }} />
      <span className="dot cmp" style={{ left: `${b}%` }} />
    </div>
  );
}

/** Left-hand tyres have their outside edge on the left of the car, right-hand tyres on the right. */
const BANDS: Record<"L" | "R", ("inner" | "middle" | "outer")[]> = {
  L: ["outer", "middle", "inner"],
  R: ["inner", "middle", "outer"],
};
const TYRE_GRID: TyreCorner[][] = [
  ["LF", "RF"],
  ["LR", "RR"],
];

/** Cool (blue) to hot (red) across the range of temperatures on screen. */
const heat = (t: number) => `hsl(${Math.round(220 - 220 * t)} 62% 30%)`;

function TyreCard({
  corner,
  refTyre,
  cmpTyre,
  scale,
}: {
  corner: TyreCorner;
  refTyre: TyreSummary;
  cmpTyre: TyreSummary;
  scale: [number, number];
}) {
  const { units } = useUnits();
  const bands = BANDS[corner[0] as "L" | "R"];
  const cell = (c: TyreSummary, band: (typeof bands)[number], who: "ref" | "cmp") => (
    <td
      key={`${who}-${band}`}
      className="mono heat"
      style={{ background: heat(along(c[band], scale)) }}
      title={`${who === "ref" ? "Reference" : "Compared"} ${band}: ${convertTemp(c[band], units).toFixed(1)}${tempUnit(units)}`}
    >
      {Math.round(convertTemp(c[band], units))}
    </td>
  );
  const avg = (t: TyreSummary) => (t.inner + t.middle + t.outer) / 3;
  const dTemp = avg(cmpTyre) - avg(refTyre);
  const dPress =
    refTyre.pressure != null && cmpTyre.pressure != null ? cmpTyre.pressure - refTyre.pressure : null;
  const press = (p: number | null) => (p == null ? "–" : convertPressure(p, units).toFixed(units === "imperial" ? 1 : 0));

  return (
    <div className="tyre">
      <h4>
        {corner} <small>{bands.join(" · ")}</small>
      </h4>
      <table>
        <tbody>
          <tr>
            <th className="ref">●</th>
            {bands.map((b) => cell(refTyre, b, "ref"))}
          </tr>
          <tr>
            <th className="cmp">●</th>
            {bands.map((b) => cell(cmpTyre, b, "cmp"))}
          </tr>
        </tbody>
      </table>
      <p className="mono muted">
        {signed(convertTempDelta(dTemp, units), 1)}
        {tempUnit(units)} avg
        {dPress != null && (
          <>
            {" · "}
            {press(refTyre.pressure)} → {press(cmpTyre.pressure)} {pressureUnit(units)}
          </>
        )}
      </p>
    </div>
  );
}

export function ConditionsPanel({ comparison: c }: Props) {
  const { units } = useUnits();
  const { ref_conditions: ref, cmp_conditions: cmp } = c;
  const rows = METRICS.map((m) => ({ m, a: m.get(ref), b: m.get(cmp) })).filter(
    (r): r is { m: Metric; a: number; b: number } => r.a != null && r.b != null,
  );
  const tyreCorners = TYRE_GRID.flat().filter((k) => ref.tyres[k] && cmp.tyres[k]);
  if (!rows.length && !tyreCorners.length) return null;

  const notes = conditionNotes(ref, cmp, units);
  const temps = tyreCorners.flatMap((k) =>
    [ref.tyres[k], cmp.tyres[k]].flatMap((t) => [t!.inner, t!.middle, t!.outer]),
  );
  const scale: [number, number] = [Math.min(...temps), Math.max(...temps)];

  return (
    <section className="panel conditions">
      <div className="cond-weather">
        <h3>Track conditions</h3>
        <div className="cond-rows">
          {rows.map(({ m, a, b }) => (
            <div className="cond-row" key={m.label}>
              <span className="label">{m.label}</span>
              <Dumbbell metric={m} a={a} b={b} />
              <span className="mono values">
                <span className="ref">{m.show(a, units)}</span>
                {" → "}
                <span className="cmp">{m.show(b, units)}</span>
              </span>
              <span className="mono muted delta">{m.showDelta(b - a, units)}</span>
            </div>
          ))}
        </div>
        {rows.length > 0 && (
          <p className={`hint cond-note${notes.length ? " differs" : ""}`}>
            {notes.length
              ? `${notes.join(". ")}. Part of the gap may be conditions rather than driving.`
              : "Conditions were about the same for both laps."}
          </p>
        )}
      </div>

      {tyreCorners.length > 0 && (
        <div className="cond-tyres">
          <h3>
            Tyre temperatures <small>(lap median, {tempUnit(units)})</small>
          </h3>
          <div className="tyre-grid">
            {TYRE_GRID.flat().map((k) =>
              ref.tyres[k] && cmp.tyres[k] ? (
                <TyreCard
                  key={k}
                  corner={k}
                  refTyre={ref.tyres[k]}
                  cmpTyre={cmp.tyres[k]}
                  scale={scale}
                />
              ) : (
                <div key={k} />
              ),
            )}
          </div>
          <p className="hint">
            Surface temperature across each tyre, as seen from above. <span className="ref">●</span>{" "}
            reference, <span className="cmp">●</span> compared.
          </p>
        </div>
      )}
    </section>
  );
}
