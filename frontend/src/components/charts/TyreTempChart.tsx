import { useMemo } from "react";
import type { TyreCorner } from "../../lib/types";
import { tempUnit } from "../../lib/units";
import { CMP, REF } from "./chartDefaults";
import { fitDomain } from "./chartRows";
import { ChartFrame } from "./ChartFrame";
import { line, unitTooltip } from "./series";
import type { ChartProps } from "./types";
import { TyreSelector } from "./TyreSelector";

interface Props extends ChartProps {
  tyreCorners: TyreCorner[];
  shownTyre: TyreCorner | undefined;
  onSelectTyre: (corner: TyreCorner) => void;
}

/** The selected corner lives in TelemetryCharts because it decides which values the rows hold. */
export function TyreTempChart({ shared, showAxis, tyreCorners, shownTyre, onSelectTyre }: Props) {
  const { comparison: c, rows, zoom, units } = shared;
  const domain = useMemo(() => fitDomain(rows, ["refTyre", "cmpTyre"], zoom), [rows, zoom]);

  return (
    <ChartFrame
      shared={shared}
      titleClassName="chart-title"
      title={
        <>
          <span>
            Tyre temperature <small>(mean of inner, middle and outer)</small>
          </span>
          <TyreSelector corners={tyreCorners} selected={shownTyre} onSelect={onSelectTyre} />
        </>
      }
      height={150}
      showAxis={showAxis}
      yAxis={{ domain, allowDataOverflow: true, tickFormatter: (v: number) => String(Math.round(v)) }}
    >
      {unitTooltip(units, tempUnit(units), 1)}
      {line("refTyre", REF, c.ref.label)}
      {line("cmpTyre", CMP, c.cmp.label)}
    </ChartFrame>
  );
}
