import { useUnits } from "../../context/UnitsContext";
import type { TyreCorner, TyreSummary } from "../../lib/types";
import {
  convertPressure,
  convertTemp,
  convertTempDelta,
  pressureUnit,
  tempUnit,
} from "../../lib/units";
import { along, signed } from "./metrics";
import { BANDS, type Band, heat } from "./tyres";

interface Props {
  corner: TyreCorner;
  refTyre: TyreSummary;
  cmpTyre: TyreSummary;
  scale: [number, number];
}

export function TyreCard({ corner, refTyre, cmpTyre, scale }: Props) {
  const { units } = useUnits();
  const bands = BANDS[corner[0] as "L" | "R"];
  const cell = (c: TyreSummary, band: Band, who: "ref" | "cmp") => (
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
