import { fireEvent, render, screen } from "@testing-library/react";
import { makeComparison, makeCorner } from "../../../test/fixtures";
import { metric } from "../../../test/units";
import { CornerRow } from "../CornerRow";

const c = makeComparison();
const onHover = jest.fn();
const onSelect = jest.fn();
const row = (corner = c.corners[0], isWorst = false) => (
  <table>
    <tbody>
      <CornerRow corner={corner} comparison={c} isWorst={isWorst} onHover={onHover} onSelect={onSelect} />
    </tbody>
  </table>
);

it("reports hover and select", () => {
  render(row(), { wrapper: metric });
  const tr = screen.getByTitle(/Click to zoom/);
  fireEvent.mouseEnter(tr);
  expect(onHover).toHaveBeenCalledWith(2); // apex 150 of 1000 over 11 points
  fireEvent.mouseLeave(tr);
  expect(onHover).toHaveBeenLastCalledWith(null);
  fireEvent.click(tr);
  expect(onSelect).toHaveBeenCalledWith(c.corners[0]);
});

it("styles by delta", () => {
  const { rerender } = render(row(), { wrapper: metric });
  expect(screen.getByText("+0.10")).toHaveClass("loss");
  rerender(row(c.corners[1], true));
  expect(screen.getByTitle(/Click to zoom/)).toHaveClass("worst");
  expect(screen.getByText("−0.05")).toHaveClass("gain");
  rerender(row(makeCorner({ time_delta: 0 })));
  expect(screen.getByText("±0.00").className).not.toMatch(/loss|gain/);
});
