import { render, screen } from "@testing-library/react";
import { makeConditions } from "../../../test/fixtures";
import { metric } from "../../../test/units";
import { METRICS } from "../metrics";
import { WeatherSection } from "../WeatherSection";

it("shows rows and a note only when there are rows", () => {
  const c = makeConditions();
  const rows = [{ metric: METRICS[0], refValue: 30, cmpValue: 35 }];
  const { rerender } = render(<WeatherSection rows={rows} refConditions={c} cmpConditions={c} />, { wrapper: metric });
  expect(screen.getByText("Track temp")).toBeInTheDocument();
  expect(screen.getByText(/about the same/)).toBeInTheDocument();
  rerender(<WeatherSection rows={[]} refConditions={c} cmpConditions={c} />);
  expect(screen.queryByText(/about the same/)).toBeNull();
});
