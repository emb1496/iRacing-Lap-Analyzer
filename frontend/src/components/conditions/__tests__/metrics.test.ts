import { makeConditions } from "../../../test/fixtures";
import { along, conditionNotes, METRICS, signed } from "../metrics";

it("signs numbers", () => {
  expect(signed(2)).toBe("+2");
  expect(signed(-2)).toBe("−2");
  expect(signed(0)).toBe("±0");
  expect(signed(0.04, 1)).toBe("±0.0");
  expect(signed(1.26, 1)).toBe("+1.3");
});

it("positions values on a scale", () => {
  expect(along(5, [0, 10])).toBe(0.5);
  expect(along(-5, [0, 10])).toBe(0);
  expect(along(50, [0, 10])).toBe(1);
});

it("formats every metric in both unit systems", () => {
  const c = makeConditions();
  for (const m of METRICS) {
    const v = m.get(c)!;
    for (const u of ["metric", "imperial"] as const) {
      expect(m.show(v, u)).toEqual(expect.any(String));
      expect(m.showDelta(2, u)).toEqual(expect.any(String));
    }
  }
});

it("describes wetness", () => {
  const wet = METRICS.find((m) => m.label === "Track wetness")!;
  expect(wet.show(2, "metric")).toBe("Mostly dry");
  expect(wet.show(99, "metric")).toBe("Unknown");
  expect(wet.showDelta(0, "metric")).toBe("same");
  expect(wet.showDelta(1, "metric")).toBe("wetter");
  expect(wet.showDelta(-1, "metric")).toBe("drier");
});

describe("conditionNotes", () => {
  const base = makeConditions();
  it("is empty when similar", () => {
    expect(conditionNotes(base, { ...base, track_temp: 31 }, "metric")).toEqual([]);
  });
  it("describes temperature, wetness and wind", () => {
    const warm = conditionNotes(base, { ...base, track_temp: 40, wetness: 3, wind_speed: 30 }, "metric");
    expect(warm).toEqual([
      "Track was 10°C warmer on the compared lap",
      "Surface was very lightly wet on the compared lap, dry on the reference",
      "Wind was 20 km/h stronger on the compared lap",
    ]);
    const cool = conditionNotes(base, { ...base, track_temp: 20, wind_speed: 0 }, "imperial");
    expect(cool[0]).toBe("Track was 18°F cooler on the compared lap");
    expect(cool[1]).toMatch(/lighter/);
  });
  it("handles unknown wetness values and missing data", () => {
    const n = conditionNotes({ ...base, wetness: 50 }, { ...base, wetness: 60 }, "metric");
    expect(n[0]).toBe("Surface was unknown on the compared lap, unknown on the reference");
    const empty = makeConditions({ track_temp: null, wetness: null, wind_speed: null });
    expect(conditionNotes(empty, base, "metric")).toEqual([]);
  });
});
