import { useUnits } from "../../context/UnitsContext";
import { formatDelta } from "../../lib/format";
import { describeCorner } from "../../lib/insight";
import { indexAt } from "../../lib/range";
import type { Comparison, Corner } from "../../lib/types";
import { convertSpeed, formatShortDist } from "../../lib/units";

interface Props {
  corner: Corner;
  comparison: Comparison;
  isWorst: boolean;
  onHover: (index: number | null) => void;
  onSelect: (corner: Corner) => void;
}

export function CornerRow({ corner: k, comparison: c, isWorst, onHover, onSelect }: Props) {
  const { units } = useUnits();
  return (
    <tr
      className={isWorst ? "worst" : ""}
      onMouseEnter={() => onHover(indexAt(k.apex, c.track_length, c.distance.length))}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(k)}
      title="Click to zoom the charts to this corner"
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
  );
}
