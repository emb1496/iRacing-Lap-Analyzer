import { render, screen } from "@testing-library/react";
import { makeComparison } from "../../../test/fixtures";
import { metric } from "../../../test/units";
import { MapLegend } from "../MapLegend";

const c = makeComparison();

it("describes delta view", () => {
  render(<MapLegend comparison={c} lineMode={false} gap={null} />, { wrapper: metric });
  expect(screen.getByText(/Lap 2 losing/)).toBeInTheDocument();
});

it("shows the gap in line view only when hovering", () => {
  const { rerender } = render(<MapLegend comparison={c} lineMode gap={null} />, { wrapper: metric });
  expect(screen.queryByText(/Apart/)).toBeNull();
  rerender(<MapLegend comparison={c} lineMode gap={12} />);
  expect(screen.getByText("Apart: 12 m")).toBeInTheDocument();
});
