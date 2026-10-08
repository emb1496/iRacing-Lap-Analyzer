import { render, screen } from "@testing-library/react";
import { makeShared } from "../../../test/chartShared";
import { ThrottleChart } from "../ThrottleChart";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../../../test/rechartsMock").ResponsiveContainer,
}));

it("renders with and without its distance axis", () => {
  const shared = makeShared();
  const { container, rerender } = render(<ThrottleChart shared={shared} showAxis />);
  expect(screen.getByRole("heading", { name: /Throttle/ })).toBeInTheDocument();
  expect(container.querySelector(".recharts-xAxis")).toBeInTheDocument();
  rerender(<ThrottleChart shared={shared} showAxis={false} />);
  expect(container.querySelector(".recharts-line, .recharts-area")).toBeInTheDocument();
});
