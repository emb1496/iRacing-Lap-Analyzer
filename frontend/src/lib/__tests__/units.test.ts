import * as u from "../units";

it("converts speed", () => {
  expect(u.speedUnit("metric")).toBe("km/h");
  expect(u.speedUnit("imperial")).toBe("mph");
  expect(u.convertSpeed(100, "metric")).toBe(100);
  expect(u.convertSpeed(160.9344, "imperial")).toBeCloseTo(100);
  expect(u.formatSpeed(100, "metric")).toBe("100 km/h");
});

it("converts temperature", () => {
  expect(u.tempUnit("metric")).toBe("°C");
  expect(u.tempUnit("imperial")).toBe("°F");
  expect(u.convertTemp(100, "imperial")).toBe(212);
  expect(u.convertTemp(100, "metric")).toBe(100);
  expect(u.convertTempDelta(10, "imperial")).toBe(18);
  expect(u.convertTempDelta(10, "metric")).toBe(10);
});

it("converts pressure", () => {
  expect(u.pressureUnit("metric")).toBe("kPa");
  expect(u.pressureUnit("imperial")).toBe("psi");
  expect(u.convertPressure(100, "metric")).toBe(100);
  expect(u.convertPressure(100, "imperial")).toBeCloseTo(14.5);
});

it("formats distances", () => {
  expect(u.formatShortDist(null, "metric")).toBe("–");
  expect(u.formatShortDist(10, "metric")).toBe("10 m");
  expect(u.formatShortDist(10, "imperial")).toBe("33 ft");
  expect(u.formatLongDist(5000, "metric")).toBe("5.0 km");
  expect(u.formatLongDist(1609.344, "imperial")).toBe("1.00 mi");
});
