import { render, screen } from "@testing-library/react";
import { makeComparison, makeCorner } from "../../../test/fixtures";
import { SummaryStats } from "../SummaryStats";

it("shows times, the gap and a headline for a losing corner", () => {
  render(<SummaryStats comparison={makeComparison()} />);
  expect(screen.getByText("1:30.500")).toBeInTheDocument();
  expect(screen.getByText("1:31.250")).toBeInTheDocument();
  expect(screen.getByText("+0.750s")).toBeInTheDocument();
  expect(screen.getByText(/Biggest loss/)).toBeInTheDocument();
  expect(screen.getByText(/Turn 1:/)).toBeInTheDocument();
});

it("shows a gain and no headline when no corner loses time", () => {
  const c = makeComparison({
    cmp: { session_id: "s", lap: 2, lap_time: 80, label: "Fast" },
    corners: [makeCorner({ time_delta: 0.01 })],
  });
  render(<SummaryStats comparison={c} />);
  expect(screen.queryByText(/Biggest loss/)).toBeNull();
  expect(screen.getByText(/−/)).toBeInTheDocument();
});

it("copes with no corners", () => {
  render(<SummaryStats comparison={makeComparison({ corners: [] })} />);
  expect(screen.queryByText(/Biggest loss/)).toBeNull();
});
