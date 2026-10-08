import { render, screen } from "@testing-library/react";
import { makeShared } from "../../../test/chartShared";
import { ChartFrame } from "../ChartFrame";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../../../test/rechartsMock").ResponsiveContainer,
}));

const frame = (props: Partial<React.ComponentProps<typeof ChartFrame>> = {}, shared = makeShared()) => (
  <ChartFrame shared={shared} title="T" height={100} showAxis yAxis={{ domain: [0, 1] }} {...props}>
    {null}
  </ChartFrame>
);

it("renders a line chart with the title", () => {
  const { container } = render(frame({ titleClassName: "chart-title" }));
  expect(screen.getByRole("heading", { name: "T" })).toHaveClass("chart-title");
  expect(container.querySelector(".recharts-line")).toBeNull();
  expect(container.querySelector(".recharts-cartesian-grid")).toBeInTheDocument();
});

it("renders a composed chart", () => {
  const { container } = render(frame({ composed: true }));
  expect(container.querySelector(".recharts-wrapper")).toBeInTheDocument();
});

it("hides the x axis unless asked", () => {
  const { container, rerender } = render(frame());
  expect(container.querySelector(".recharts-xAxis")).toBeInTheDocument();
  rerender(frame({ showAxis: false }));
  expect(container.querySelector(".recharts-xAxis")).toBeNull();
});

it("formats ticks in kilometres when zoomed out and metres when zoomed in", () => {
  const { container, rerender } = render(frame({}, makeShared({ domain: [0, 5000] })));
  expect(container.textContent).toMatch(/km/);
  rerender(frame({}, makeShared({ domain: [100, 400] })));
  expect(container.textContent).toMatch(/ m/);
});
