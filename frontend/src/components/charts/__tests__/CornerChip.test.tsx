import { fireEvent, render, screen } from "@testing-library/react";
import { makeCorner } from "../../../test/fixtures";
import { CornerChip } from "../CornerChip";

const corner = makeCorner();

it("toggles its zoom", () => {
  const onZoom = jest.fn();
  const { rerender } = render(<CornerChip corner={corner} trackLength={1000} zoom={null} onZoom={onZoom} />);
  fireEvent.click(screen.getByText("T1"));
  expect(onZoom).toHaveBeenCalledWith([50, 250]);
  rerender(<CornerChip corner={corner} trackLength={1000} zoom={[50, 250]} onZoom={onZoom} />);
  expect(screen.getByText("T1")).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByText("T1"));
  expect(onZoom).toHaveBeenLastCalledWith(null);
});
