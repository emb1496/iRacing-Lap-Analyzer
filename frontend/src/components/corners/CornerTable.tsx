import { useUnits } from "../../context/UnitsContext";
import { worstCorner } from "../../lib/corners";
import type { Comparison, Corner } from "../../lib/types";
import { speedUnit } from "../../lib/units";
import { CornerRow } from "./CornerRow";

interface Props {
  comparison: Comparison;
  onHover: (index: number | null) => void;
  onSelect: (corner: Corner) => void;
}

export function CornerTable({ comparison: c, onHover, onSelect }: Props) {
  const { units } = useUnits();
  const worst = worstCorner(c.corners)?.time_delta ?? 0;

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
            <CornerRow
              key={k.number}
              corner={k}
              comparison={c}
              isWorst={k.time_delta === worst && worst > 0.02}
              onHover={onHover}
              onSelect={onSelect}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
