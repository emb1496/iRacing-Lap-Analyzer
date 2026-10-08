import { useUnits } from "../../context/UnitsContext";
import type { Comparison } from "../../lib/types";
import { formatShortDist } from "../../lib/units";

interface Props {
  comparison: Comparison;
  lineMode: boolean;
  /** Metres between the two laps at the hovered point, in line view. */
  gap: number | null;
}

export function MapLegend({ comparison: c, lineMode, gap }: Props) {
  const { units } = useUnits();
  return lineMode ? (
    <div className="legend">
      <span className="swatch ref" /> {c.ref.label}
      <span className="swatch cmp" /> {c.cmp.label}
      {gap != null && <span className="gap">Apart: {formatShortDist(gap, units)}</span>}
    </div>
  ) : (
    <div className="legend">
      <span className="swatch loss" /> {c.cmp.label} losing
      <span className="swatch gain" /> gaining
    </div>
  );
}
