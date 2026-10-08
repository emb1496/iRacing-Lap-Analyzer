import type { Comparison } from "../../lib/types";
import { METRICS } from "./metrics";
import { loggedTyreCorners } from "./tyres";
import { TyreSection } from "./TyreSection";
import { type MetricValues, WeatherSection } from "./WeatherSection";

interface Props {
  comparison: Comparison;
}

export function ConditionsPanel({ comparison: c }: Props) {
  const { ref_conditions: ref, cmp_conditions: cmp } = c;
  const rows = METRICS.flatMap<MetricValues>((metric) => {
    const refValue = metric.get(ref);
    const cmpValue = metric.get(cmp);
    return refValue != null && cmpValue != null ? [{ metric, refValue, cmpValue }] : [];
  });
  const hasTyres = loggedTyreCorners(ref, cmp).length > 0;
  if (!rows.length && !hasTyres) return null;

  return (
    <section className="panel conditions">
      <WeatherSection rows={rows} refConditions={ref} cmpConditions={cmp} />
      {hasTyres && <TyreSection refConditions={ref} cmpConditions={cmp} />}
    </section>
  );
}
