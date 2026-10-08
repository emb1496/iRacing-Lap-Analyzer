import { render, screen } from "@testing-library/react";
import { imperial, metric } from "../../../test/units";
import { METRICS } from "../metrics";
import { MetricRow } from "../MetricRow";

it("shows both values and the delta in metric", () => {
  render(<MetricRow metric={METRICS[0]} refValue={30} cmpValue={35} />, { wrapper: metric });
  expect(screen.getByText("Track temp")).toBeInTheDocument();
  expect(screen.getByText("30°C")).toBeInTheDocument();
  expect(screen.getByText("+5°C")).toBeInTheDocument();
});

it("converts to imperial", () => {
  render(<MetricRow metric={METRICS[0]} refValue={30} cmpValue={35} />, { wrapper: imperial });
  expect(screen.getByText("86°F")).toBeInTheDocument();
  expect(screen.getByText("95°F")).toBeInTheDocument();
  expect(screen.getByText("+9°F")).toBeInTheDocument();
});
