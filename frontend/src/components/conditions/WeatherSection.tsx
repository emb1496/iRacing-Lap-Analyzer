import { useUnits } from "../../context/UnitsContext";
import type { Conditions } from "../../lib/types";
import { ConditionsNote } from "./ConditionsNote";
import { conditionNotes, type Metric } from "./metrics";
import { MetricRow } from "./MetricRow";

export interface MetricValues {
  metric: Metric;
  refValue: number;
  cmpValue: number;
}

interface Props {
  rows: MetricValues[];
  refConditions: Conditions;
  cmpConditions: Conditions;
}

export function WeatherSection({ rows, refConditions, cmpConditions }: Props) {
  const { units } = useUnits();
  return (
    <div className="cond-weather">
      <h3>Track conditions</h3>
      <div className="cond-rows">
        {rows.map((r) => (
          <MetricRow key={r.metric.label} {...r} />
        ))}
      </div>
      {rows.length > 0 && (
        <ConditionsNote notes={conditionNotes(refConditions, cmpConditions, units)} />
      )}
    </div>
  );
}
