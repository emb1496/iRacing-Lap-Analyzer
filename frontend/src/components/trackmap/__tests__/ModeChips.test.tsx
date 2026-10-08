import { fireEvent, render, screen } from "@testing-library/react";
import { ModeChips } from "../ModeChips";

it("switches modes and disables line when unavailable", () => {
  const onChange = jest.fn();
  const { rerender } = render(<ModeChips lineMode={false} lineAvailable onChange={onChange} />);
  fireEvent.click(screen.getByText("Line"));
  expect(onChange).toHaveBeenCalledWith("line");
  fireEvent.click(screen.getByText("Delta"));
  expect(onChange).toHaveBeenCalledWith("delta");
  rerender(<ModeChips lineMode={false} lineAvailable={false} onChange={onChange} />);
  expect(screen.getByText("Line")).toBeDisabled();
});
