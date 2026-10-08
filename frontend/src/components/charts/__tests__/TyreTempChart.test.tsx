import { fireEvent, render, screen } from "@testing-library/react";
import { makeShared } from "../../../test/chartShared";
import { TyreTempChart } from "../TyreTempChart";

jest.mock("recharts", () => ({
  ...jest.requireActual("recharts"),
  ResponsiveContainer: jest.requireActual("../../../test/rechartsMock").ResponsiveContainer,
}));

it("renders and forwards tyre selection", () => {
  const onSelectTyre = jest.fn();
  render(
    <TyreTempChart shared={makeShared()} showAxis tyreCorners={["LF", "RF"]} shownTyre="RF" onSelectTyre={onSelectTyre} />,
  );
  expect(screen.getByRole("heading", { name: /Tyre temperature/ })).toBeInTheDocument();
  fireEvent.click(screen.getByText("LF"));
  expect(onSelectTyre).toHaveBeenCalledWith("LF");
});
