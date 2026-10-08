import { fireEvent, render, screen } from "@testing-library/react";
import { makeComparison, makeTrace } from "../../../test/fixtures";
import { TelemetryCharts } from "../TelemetryCharts";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../../../test/rechartsMock").ResponsiveContainer,
}));

const renderCharts = (c = makeComparison(), zoom: [number, number] | null = null, onZoom = jest.fn()) =>
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
