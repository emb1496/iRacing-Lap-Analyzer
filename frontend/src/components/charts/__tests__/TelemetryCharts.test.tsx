import { act, fireEvent, render, screen } from "@testing-library/react";
import type { MouseHandlerDataParam } from "recharts";
import { makeComparison, makeTrace } from "../../../test/fixtures";
import { TelemetryCharts } from "../TelemetryCharts";
import type { ChartShared } from "../types";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../../../test/rechartsMock").ResponsiveContainer,
}));

// Capture the shared chart props so a test can drive the brush handlers recharts would call.
let mockShared: ChartShared;
jest.mock("../SpeedChart", () => {
  const { SpeedChart } = jest.requireActual("../SpeedChart");
  const { createElement } = jest.requireActual("react");
  return {
    SpeedChart: (props: { shared: ChartShared }) => {
      mockShared = props.shared;
      return createElement(SpeedChart, props);
    },
  };
});

const renderCharts =(c = makeComparison(), zoom: [number, number] | null = null, onZoom = jest.fn()) =>
  render(<TelemetryCharts comparison={c} onHover={jest.fn()} zoom={zoom} onZoom={onZoom} />);

it("renders every chart when all channels exist", () => {
  renderCharts();
  for (const t of ["Time delta", "Speed", "Throttle", "Brake", "Steering", "Gear", "Tyre temperature"]) {
    expect(screen.getByRole("heading", { name: new RegExp(t) })).toBeInTheDocument();
  }
});

it("zooms out on double click and ends a drag on mouse up", () => {
  const onZoom = jest.fn();
  const { container } = renderCharts(makeComparison(), null, onZoom);
  const root = container.querySelector(".charts") as HTMLElement;
  fireEvent.doubleClick(root);
  expect(onZoom).toHaveBeenCalledWith(null);
  fireEvent.mouseUp(root);
});

it("marks the charts as brushing while a drag is in progress", () => {
  const { container } = renderCharts();
  const root = container.querySelector(".charts") as HTMLElement;
  expect(root).not.toHaveClass("brushing");
  act(() => mockShared.handlers.onMouseDown({ activeTooltipIndex: 1 } as MouseHandlerDataParam));
  expect(root).toHaveClass("brushing");
  fireEvent.mouseUp(root);
  expect(root).not.toHaveClass("brushing");
});

it("switches the tyre", () => {
  renderCharts();
  fireEvent.click(screen.getByText("LR"));
  expect(screen.getByText("LR")).toHaveAttribute("aria-pressed", "true");
});

it("falls back to the first logged tyre when the default is missing", () => {
  const tyres = makeTrace().tyre_temp!;
  const noRF = makeTrace({ tyre_temp: { LF: tyres.LF, LR: tyres.LR, RR: tyres.RR } as typeof tyres });
  renderCharts(makeComparison({ ref_trace: noRF, cmp_trace: noRF }));
  expect(screen.getByText("LF")).toHaveAttribute("aria-pressed", "true");
});

it.each([
  ["no tyres", { tyre_temp: null }, "Gear"],
  ["no tyres or gear", { tyre_temp: null, gear: null }, "Steering"],
  ["no tyres, gear or steering", { tyre_temp: null, gear: null, steering: null }, "Brake"],
  ["only speed", { tyre_temp: null, gear: null, steering: null, throttle: null, brake: null }, "Speed"],
])("shows the distance axis once, on the bottom chart, with %s", (_name, over, last) => {
  const t = makeTrace(over);
  const { container } = renderCharts(makeComparison({ ref_trace: t, cmp_trace: t }));
  expect(container.querySelectorAll(".recharts-xAxis")).toHaveLength(1);
  expect(screen.getByRole("heading", { name: new RegExp(last) })).toBeInTheDocument();
});

it("filters corners to the zoom window", () => {
  renderCharts(makeComparison(), [0, 300]);
  expect(screen.getByText("Showing 0 m – 300 m")).toBeInTheDocument();
});
