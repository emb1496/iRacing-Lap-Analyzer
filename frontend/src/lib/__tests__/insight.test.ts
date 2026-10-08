import { makeCorner } from "../../test/fixtures";
import { describeCorner } from "../insight";
import type { Reason } from "../types";
import type { Units } from "../units";

const reason = (kind: Reason["kind"], value: number | null) => ({ kind, value });
const describe_ = (reasons: Reason[], delta = 0.2, units: Units = "metric") =>
  describeCorner(makeCorner({ time_delta: delta, insight: { even: false, reasons } }), units);

it("handles even corners", () => {
  expect(describeCorner(makeCorner({ insight: { even: true, reasons: [] } }), "metric")).toBe("even.");
});
it("handles no reasons", () => {
  expect(describe_([])).toContain("no single obvious cause");
});
it("describes every reason in both directions", () => {
  const text = describe_([
    reason("brake_point", 10),
    reason("brake_point", -10),
    reason("brake_new", 1),
    reason("brake_pressure", -5),
    reason("brake_pressure", 5),
    reason("apex_speed", -3),
    reason("apex_speed", 3),
    reason("throttle_point", 20),
    reason("throttle_point", -20),
    reason("throttle_point", null),
  ]);
  for (const s of [
    "braking 10 m earlier",
    "braking 10 m later",
    "braking where the reference lap didn't",
    "5% less brake pressure",
    "5% more brake pressure",
    "3 km/h slower at the apex",
    "3 km/h faster at the apex",
    "full throttle 20 m later",
    "full throttle 20 m sooner",
  ]) {
    expect(text).toContain(s);
  }
  expect(text.startsWith("losing 0.20s")).toBe(true);
});
it("says gaining for negative deltas", () => {
  expect(describe_([reason("brake_new", null)], -0.2)).toMatch(/^gaining/);
});
