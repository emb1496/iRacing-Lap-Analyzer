import { formatDelta, formatMetres, indexAt } from "../format";
import type { Comparison } from "../types";

interface Props {
  comparison: Comparison;
  onHover: (index: number | null) => void;
}

export function CornerTable({ comparison: c, onHover }: Props) {
  const worst = Math.max(...c.corners.map((k) => k.time_delta));

  return (
    <div className="panel corners">
      <table>
        <thead>
          <tr>
            <th>Turn</th>
            <th>Δ</th>
            <th>Apex km/h</th>
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
                <span className="ref">{Math.round(k.ref_min_speed)}</span> /{" "}
                <span className="cmp">{Math.round(k.cmp_min_speed)}</span>
              </td>
              <td className="mono">
                <span className="ref">{formatMetres(k.ref_brake)}</span> /{" "}
                <span className="cmp">{formatMetres(k.cmp_brake)}</span>
              </td>
              <td className="insight">{k.insight.replace(/^Turn \d+: /, "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
