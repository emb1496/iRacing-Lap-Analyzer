import { render } from "@testing-library/react";
import { makeComparison } from "../../../test/fixtures";
import { TelemetryCharts } from "../TelemetryCharts";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../../../test/rechartsMock").ResponsiveContainer,
}));

// A drag is driven by recharts mouse events, which jsdom can't produce; stand in for the hook.
jest.mock("../../../hooks/useBrush", () => ({
  useBrush: () => ({
    chartsEl: { current: null },
    barEl: { current: null },
    brushEl: { current: null },
    dragging: true,
    commitDrag: jest.fn(),
    handlers: {},
  }),
}));

it("marks the charts as brushing while a drag is in progress", () => {
  const { container } = render(
    <TelemetryCharts comparison={makeComparison()} onHover={jest.fn()} zoom={null} onZoom={jest.fn()} />,
  );
  expect(container.querySelector(".charts")).toHaveClass("brushing");
});
