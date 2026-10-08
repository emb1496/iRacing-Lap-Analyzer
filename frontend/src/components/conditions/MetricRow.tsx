import { useUnits } from "../../context/UnitsContext";
import { Dumbbell } from "./Dumbbell";
import type { Metric } from "./metrics";

interface Props {
  metric: Metric;
  refValue: number;
  cmpValue: number;
}

export function MetricRow({ metric, refValue, cmpValue }: Props) {
  const { units } = useUnits();
  return (
    <div className="cond-row">
      <span className="label">{metric.label}</span>
      <Dumbbell range={metric.range} refValue={refValue} cmpValue={cmpValue} />
      <span className="mono values">
        <span className="ref">{metric.show(refValue, units)}</span>
        {" → "}
        <span className="cmp">{metric.show(cmpValue, units)}</span>
      </span>
      <span className="mono muted delta">{metric.showDelta(cmpValue - refValue, units)}</span>
    </div>
  );
}
