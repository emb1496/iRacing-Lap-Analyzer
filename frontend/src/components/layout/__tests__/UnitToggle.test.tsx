import { fireEvent, render, screen } from "@testing-library/react";
import { metric } from "../../../test/units";
import { UnitToggle } from "../UnitToggle";

it("toggles units", () => {
  render(<UnitToggle />, { wrapper: metric });
  const imperial = screen.getByText("mi · ft");
  expect(screen.getByText("km · m")).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(imperial);
  expect(imperial).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("km · m")).toHaveAttribute("aria-pressed", "false");
});
