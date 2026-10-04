import { convertSpeed, formatDelta, formatShortDist, indexAt, speedUnit } from "../format";
import { describeCorner } from "../insight";
import type { Comparison } from "../types";
import { useUnits } from "../units";

interface Props {
  comparison: Comparison;
  onHover: (index: number | null) => void;
}

export function CornerTable({ comparison: c, onHover }: Props) {
  const { units } = useUnits();
  const worst = Math.max(...c.corners.map((k) => k.time_delta));

  return (
    <div className="panel corners">
      <table>
        <thead>
          <tr>
            <th>Turn</th>
            <th>Δ</th>
            <th>Apex {speedUnit(units)}</th>
            <th>Brake point</th>
            <th>What happened</th>
          </tr>
        </thead>
        <tbody>
          {c.corners.map((k) => (
            <tr
              key={k.number}
              className={k.time_delta === worst && worst > 0.02 ? "worst" : ""}
              onMouseEnter={() => onHover(indexAt(k.apex, c.track_length, c.distance.length))}
              onMouseLeave={() => onHover(null)}
            >
              <td>T{k.number}</td>
              <td className={`mono ${k.time_delta > 0.02 ? "loss" : k.time_delta < -0.02 ? "gain" : ""}`}>
                {formatDelta(k.time_delta, 2)}
              </td>
              <td className="mono">
                <span className="ref">{Math.round(convertSpeed(k.ref_min_speed, units))}</span> /{" "}
                <span className="cmp">{Math.round(convertSpeed(k.cmp_min_speed, units))}</span>
              </td>
              <td className="mono">
                <span className="ref">{formatShortDist(k.ref_brake, units)}</span> /{" "}
                <span className="cmp">{formatShortDist(k.cmp_brake, units)}</span>
              </td>
              <td className="insight">{describeCorner(k, units)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
