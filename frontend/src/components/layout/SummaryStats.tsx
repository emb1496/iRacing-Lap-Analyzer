import { useUnits } from "../../context/UnitsContext";
import { worstCorner } from "../../lib/corners";
import { formatDelta, formatLapTime } from "../../lib/format";
import { describeCorner } from "../../lib/insight";
import type { Comparison } from "../../lib/types";

interface Props {
  comparison: Comparison;
}

export function SummaryStats({ comparison: c }: Props) {
  const { units } = useUnits();
  const worst = worstCorner(c.corners);
  const total = c.cmp.lap_time - c.ref.lap_time;

  return (
    <section className="summary">
      <div className="stat ref">
        <label>Reference · {c.ref.label}</label>
        <strong>{formatLapTime(c.ref.lap_time)}</strong>
      </div>
      <div className="stat cmp">
        <label>Compared · {c.cmp.label}</label>
        <strong>{formatLapTime(c.cmp.lap_time)}</strong>
      </div>
      <div className={`stat ${total > 0 ? "loss" : "gain"}`}>
        <label>Gap</label>
        <strong>{formatDelta(total)}s</strong>
      </div>
      {worst && worst.time_delta > 0.02 && (
        <div className="stat headline">
          <label>Biggest loss</label>
          <span>Turn {worst.number}: {describeCorner(worst, units)}</span>
        </div>
      )}
    </section>
  );
}
