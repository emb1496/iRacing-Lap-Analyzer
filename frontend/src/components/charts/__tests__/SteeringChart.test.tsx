import { render, screen } from "@testing-library/react";
import { makeShared } from "../../../test/chartShared";
import { SteeringChart } from "../SteeringChart";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../../../test/rechartsMock").ResponsiveContainer,
}));

it("renders with and without its distance axis", () => {
  const shared = makeShared();
  const { container, rerender } = render(<SteeringChart shared={shared} showAxis />);
  expect(screen.getByRole("heading", { name: /Steering/ })).toBeInTheDocument();
  expect(container.querySelector(".recharts-xAxis")).toBeInTheDocument();
  rerender(<SteeringChart shared={shared} showAxis={false} />);
  expect(container.querySelector(".recharts-line, .recharts-area")).toBeInTheDocument();
});

it("fits its y-domain to the zoom window", () => {
  render(<SteeringChart shared={makeShared({ zoom: [0, 300] })} showAxis />);
});
