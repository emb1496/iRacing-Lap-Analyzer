import { fireEvent, render, screen } from "@testing-library/react";
import { TyreSelector } from "../TyreSelector";

it("marks the selected corner and reports clicks", () => {
  const onSelect = jest.fn();
  render(<TyreSelector corners={["LF", "RF"]} selected="RF" onSelect={onSelect} />);
  expect(screen.getByText("RF")).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("LF")).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(screen.getByText("LF"));
  expect(onSelect).toHaveBeenCalledWith("LF");
});
