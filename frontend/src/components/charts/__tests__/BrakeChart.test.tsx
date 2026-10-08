import { render, screen } from "@testing-library/react";
import { makeShared } from "../../../test/chartShared";
import { BrakeChart } from "../BrakeChart";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../../../test/rechartsMock").ResponsiveContainer,
}));

it("renders with and without its distance axis", () => {
  const shared = makeShared();
  const { container, rerender } = render(<BrakeChart shared={shared} showAxis />);
  expect(screen.getByRole("heading", { name: /Brake/ })).toBeInTheDocument();
  expect(container.querySelector(".recharts-xAxis")).toBeInTheDocument();
  rerender(<BrakeChart shared={shared} showAxis={false} />);
  expect(container.querySelector(".recharts-line, .recharts-area")).toBeInTheDocument();
});
