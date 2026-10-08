import { useUnits } from "../../context/UnitsContext";
import type { Conditions } from "../../lib/types";
import { tempUnit } from "../../lib/units";
import { TyreCard } from "./TyreCard";
import { TYRE_GRID, tyreScale } from "./tyres";

interface Props {
  refConditions: Conditions;
  cmpConditions: Conditions;
}

/** 2x2 grid of tyre heat cards laid out as seen from above the car. */
export function TyreSection({ refConditions: ref, cmpConditions: cmp }: Props) {
  const { units } = useUnits();
  const scale = tyreScale(ref, cmp);
  return (
    <div className="cond-tyres">
      <h3>
        Tyre temperatures <small>(lap median, {tempUnit(units)})</small>
      </h3>
      <div className="tyre-grid">
        {TYRE_GRID.flat().map((k) =>
          ref.tyres[k] && cmp.tyres[k] ? (
            <TyreCard key={k} corner={k} refTyre={ref.tyres[k]} cmpTyre={cmp.tyres[k]} scale={scale} />
          ) : (
            <div key={k} />
          ),
        )}
      </div>
      <p className="hint">
        Surface temperature across each tyre, as seen from above. <span className="ref">●</span>{" "}
        reference, <span className="cmp">●</span> compared.
      </p>
    </div>
  );
}
