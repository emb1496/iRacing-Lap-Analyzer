import { fireEvent, render, screen } from "@testing-library/react";
import { makeComparison, makeTrace } from "../../../test/fixtures";
import { metric } from "../../../test/units";
import { TrackMap } from "../TrackMap";

const renderMap = (props: Partial<React.ComponentProps<typeof TrackMap>> = {}) =>
  render(<TrackMap comparison={makeComparison()} hoverIndex={null} zoom={null} {...props} />, { wrapper: metric });

it("explains when there is no GPS", () => {
  renderMap({ comparison: makeComparison({ ref_trace: makeTrace({ lat: null, lon: null }) }) });
  expect(screen.getByText("No GPS channels in this file.")).toBeInTheDocument();
});

it("renders the delta view, hover dot and zoom", () => {
  const { container } = renderMap({ hoverIndex: 3, zoom: [100, 400] });
  expect(screen.getByRole("img", { name: "Test Track track map" })).toHaveAttribute("viewBox", "0 0 400 400");
  expect(container.querySelector(".hover-dot")).toBeInTheDocument();
});

it("switches to the line view, framing the zoom and showing the gap", () => {
  const { container } = renderMap({ hoverIndex: 3, zoom: [100, 400] });
  fireEvent.click(screen.getByText("Line"));
  expect(screen.getByRole("img")).not.toHaveAttribute("viewBox", "0 0 400 400");
  expect(container.querySelector(".gap")).toBeInTheDocument();
  expect(container.querySelector(".hover-dot")).toBeNull();
});

it("keeps the delta view when the compared lap has no GPS", () => {
  renderMap({ comparison: makeComparison({ cmp_trace: makeTrace({ lat: null, lon: null }) }), hoverIndex: 1 });
  expect(screen.getByText("Line")).toBeDisabled();
});

it("line view without zoom uses the full frame", () => {
  renderMap();
  fireEvent.click(screen.getByText("Line"));
  expect(screen.getByRole("img")).toHaveAttribute("viewBox", "0 0 400 400");
});
