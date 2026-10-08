import type { ComponentProps, ReactNode } from "react";
import {
  CartesianGrid,
  ComposedChart,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { formatLongDist, formatShortDist } from "../../lib/units";
import { CHART_MARGIN, Y_AXIS_DEFAULTS } from "./chartDefaults";
import { cornerLines } from "./series";
import type { ChartShared } from "./types";

interface Props {
  shared: ChartShared;
  title: ReactNode;
  titleClassName?: string;
  height: number;
  showAxis: boolean;
  yAxis: ComponentProps<typeof YAxis>;
  /** Area series need a ComposedChart. */
  composed?: boolean;
  /** Reference lines, tooltip and series, drawn after the corner markers. */
  children: ReactNode;
}

/** The title, grid, axes and corner markers every telemetry chart shares. */
export function ChartFrame({
  shared,
  title,
  titleClassName,
  height,
  showAxis,
  yAxis,
  composed = false,
  children,
}: Props) {
  const { rows, domain, units, visibleCorners, handlers } = shared;
  const body = (
    <>
      <CartesianGrid stroke="var(--grid)" vertical={false} />
      <XAxis
        dataKey="d"
        type="number"
        domain={domain}
        allowDataOverflow
        hide={!showAxis}
        tickFormatter={(m: number) =>
          domain[1] - domain[0] < 2000 ? formatShortDist(m, units) : formatLongDist(m, units)
        }
        stroke="var(--muted)"
      />
      <YAxis {...Y_AXIS_DEFAULTS} {...yAxis} />
      {cornerLines(visibleCorners)}
      {children}
    </>
  );
  const chartProps = { data: rows, syncId: "lap", margin: CHART_MARGIN, ...handlers };

  return (
    <>
      <h3 className={titleClassName}>{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {composed ? (
          <ComposedChart {...chartProps}>{body}</ComposedChart>
        ) : (
          <LineChart {...chartProps}>{body}</LineChart>
        )}
      </ResponsiveContainer>
    </>
  );
}
