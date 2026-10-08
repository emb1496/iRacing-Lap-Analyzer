import { memo, useMemo, useState } from "react";
import { useUnits } from "../../context/UnitsContext";
import { useBrush } from "../../hooks/useBrush";
import type { Range } from "../../lib/range";
import type { Comparison, TyreCorner } from "../../lib/types";
import { BrakeChart } from "./BrakeChart";
import { buildRows } from "./chartRows";
import { DeltaChart } from "./DeltaChart";
import { GearChart } from "./GearChart";
import { SpeedChart } from "./SpeedChart";
import { SteeringChart } from "./SteeringChart";
import { ThrottleChart } from "./ThrottleChart";
import type { ChartShared } from "./types";
import { TyreTempChart } from "./TyreTempChart";
import { ZoomBar } from "./ZoomBar";

interface Props {
  comparison: Comparison;
  onHover: (index: number | null) => void;
  /** Visible distance window in metres, or null for the whole lap. */
  zoom: Range | null;
  onZoom: (range: Range | null) => void;
}

const TYRE_CORNERS: TyreCorner[] = ["LF", "RF", "LR", "RR"];

// Memoised: hover changes in App must not re-render these (thousands of points each).
export const TelemetryCharts = memo(function TelemetryCharts({
  comparison: c,
  onHover,
  zoom,
  onZoom,
}: Props) {
  const { units } = useUnits();

  // The chosen tyre decides which values the rows hold, so it lives here, not in the chart.
  const tyreCorners = TYRE_CORNERS.filter(
    (k) => c.ref_trace.tyre_temp?.[k] && c.cmp_trace.tyre_temp?.[k],
  );
  const [tyre, setTyre] = useState<TyreCorner>("RF");
  const shownTyre = tyreCorners.includes(tyre) ? tyre : tyreCorners[0];
  const rows = useMemo(() => buildRows(c, units, shownTyre), [c, units, shownTyre]);

  const domain: Range = zoom ?? [0, c.track_length];
  const { chartsEl, barEl, brushEl, dragging, commitDrag, handlers } = useBrush({
    rows,
    domain,
    onHover,
    onZoom,
  });

  const shared: ChartShared = {
    comparison: c,
    rows,
    units,
    domain,
    zoom,
    visibleCorners: c.corners.filter(
      (corner) => corner.apex >= domain[0] && corner.apex <= domain[1],
    ),
    handlers,
  };

  const hasPedals = !!(c.ref_trace.throttle && c.ref_trace.brake);
  const hasSteering = !!(c.ref_trace.steering && c.cmp_trace.steering);
  const hasGear = !!(c.ref_trace.gear && c.cmp_trace.gear);
  const hasTyres = tyreCorners.length > 0;
  // Only the bottom-most chart shows the distance axis.
  const bottom = hasTyres
    ? "tyre"
    : hasGear
      ? "gear"
      : hasSteering
        ? "steer"
        : hasPedals
          ? "brake"
          : "speed";

  return (
    <div
      ref={chartsEl}
      className={`charts${dragging ? " brushing" : ""}`}
      onDoubleClick={() => onZoom(null)}
      onMouseUp={commitDrag}
    >
      <div className="brush" ref={brushEl} />
      <ZoomBar comparison={c} zoom={zoom} onZoom={onZoom} ref={barEl} />
      <DeltaChart shared={shared} showAxis={false} />
      <SpeedChart shared={shared} showAxis={bottom === "speed"} />
      {hasPedals && (
        <>
          <ThrottleChart shared={shared} showAxis={false} />
          <BrakeChart shared={shared} showAxis={bottom === "brake"} />
        </>
      )}
      {hasSteering && <SteeringChart shared={shared} showAxis={bottom === "steer"} />}
      {hasGear && <GearChart shared={shared} showAxis={bottom === "gear"} />}
      {hasTyres && (
        <TyreTempChart
          shared={shared}
          showAxis={bottom === "tyre"}
          tyreCorners={tyreCorners}
          shownTyre={shownTyre}
          onSelectTyre={setTyre}
        />
      )}
    </div>
  );
});
