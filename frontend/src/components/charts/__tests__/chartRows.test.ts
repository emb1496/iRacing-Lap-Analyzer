import { makeComparison, makeTrace } from "../../../test/fixtures";
import { buildRows, fitDomain } from "../chartRows";

describe("buildRows", () => {
  it("builds rows in display units", () => {
    const [r] = buildRows(makeComparison(), "imperial", "RF");
    expect(r.refSpeed).toBeCloseTo(100 / 1.609344);
    expect(r.refTyre).toBeCloseTo(85 * 1.8 + 32);
    expect(r.refSteer).toBeCloseTo((-0.5 * 180) / Math.PI);
  });

  it("leaves absent channels undefined", () => {
    const bare = makeTrace({ steering: null, throttle: null, tyre_temp: null });
    const c = makeComparison({ ref_trace: bare, cmp_trace: bare });
    const [r] = buildRows(c, "metric", undefined);
    expect(r.refSteer).toBeUndefined();
    expect(r.refThrottle).toBeUndefined();
    expect(r.refTyre).toBeUndefined();
    expect(buildRows(makeComparison(), "metric", undefined)[0].refTyre).toBeUndefined();
  });
});

describe("fitDomain", () => {
  const rows = buildRows(makeComparison(), "metric", "RF");

  it("fits all rows or just the zoom window", () => {
    const [lo, hi] = fitDomain(rows, ["refSpeed"], null);
    expect(lo).toBeLessThan(100);
    expect(hi).toBeGreaterThan(110);
    const [zlo, zhi] = fitDomain(rows, ["refSpeed"], [0, 200]);
    expect(zhi).toBeLessThan(hi);
    expect(zlo).toBeLessThan(100);
  });

  it("falls back when nothing is visible", () => {
    expect(fitDomain(rows, ["refSpeed"], [5000, 6000])).toEqual([0, 1]);
  });

  it("skips missing values and pads flat data", () => {
    expect(fitDomain(rows, ["refTyre"], null)).not.toEqual([0, 1]);
    expect(fitDomain([{ d: 0, delta: 0, refSpeed: 5, cmpSpeed: 5 }], ["refSpeed", "refGear"], null)).toEqual([4, 6]);
  });
});
