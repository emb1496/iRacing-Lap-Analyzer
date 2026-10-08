import { render, screen } from "@testing-library/react";
import type { Conditions } from "../../../lib/types";
import { makeComparison, makeConditions } from "../../../test/fixtures";
import { ConditionsPanel } from "../ConditionsPanel";

const without = (over: Partial<Conditions>) =>
  makeComparison({ ref_conditions: makeConditions(over), cmp_conditions: makeConditions(over) });

it("renders weather and tyres", () => {
  render(<ConditionsPanel comparison={makeComparison()} />);
  expect(screen.getByText("Track conditions")).toBeInTheDocument();
  expect(screen.getByText(/Tyre temperatures/)).toBeInTheDocument();
});

it("hides tyres when not logged", () => {
  render(<ConditionsPanel comparison={without({ tyres: {} })} />);
  expect(screen.queryByText(/Tyre temperatures/)).toBeNull();
  expect(screen.getByText("Track conditions")).toBeInTheDocument();
});

it("renders nothing when nothing was logged", () => {
  const nothing = { tyres: {}, track_temp: null, air_temp: null, wetness: null, wind_speed: null, humidity: null };
  const { container } = render(<ConditionsPanel comparison={without(nothing)} />);
  expect(container).toBeEmptyDOMElement();
});
