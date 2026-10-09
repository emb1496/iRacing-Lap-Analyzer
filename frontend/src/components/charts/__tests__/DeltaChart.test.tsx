import { render, screen } from "@testing-library/react";
import { makeShared } from "../../../test/chartShared";
import { DeltaChart, deltaSeconds } from "../DeltaChart";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../../../test/rechartsMock").ResponsiveContainer,
}));

it("renders with and without its distance axis", () => {
  const shared = makeShared();
  const { container, rerender } = render(<DeltaChart shared={shared} showAxis />);
  expect(screen.getByRole("heading", { name: /Time delta/ })).toBeInTheDocument();
  expect(container.querySelector(".recharts-xAxis")).toBeInTheDocument();
  rerender(<DeltaChart shared={shared} showAxis={false} />);
  expect(container.querySelector(".recharts-line, .recharts-area")).toBeInTheDocument();
});

it("labels visible corners", () => {
  const { container } = render(<DeltaChart shared={makeShared()} showAxis={false} />);
  expect(container.querySelectorAll(".recharts-reference-line").length).toBeGreaterThanOrEqual(3);
});

it("formats the tooltip delta in seconds", () => {
  expect(deltaSeconds(0.123)).toBe("+0.123 s");
  expect(deltaSeconds(-0.5)).toBe("−0.500 s");
});
