import { fireEvent, render, screen } from "@testing-library/react";
import { makeComparison } from "../../../test/fixtures";
import { ZoomBar } from "../ZoomBar";

it("shows the hint, then the window, and resets", () => {
  const onZoom = jest.fn();
  const c = makeComparison();
  const { rerender } = render(<ZoomBar comparison={c} zoom={null} onZoom={onZoom} />);
  expect(screen.getByText("Drag on any chart to zoom")).toBeInTheDocument();
  expect(screen.getByText("Reset zoom")).toBeDisabled();
  expect(screen.getByText("T1")).toBeInTheDocument();
  rerender(<ZoomBar comparison={c} zoom={[100, 400]} onZoom={onZoom} />);
  expect(screen.getByText("Showing 100 m – 400 m")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Reset zoom"));
  expect(onZoom).toHaveBeenCalledWith(null);
});
