import { formatDateTime, formatDelta, formatLapTime, WETNESS_LABELS } from "../format";

it("formats lap times", () => {
  expect(formatLapTime(null)).toBe("--:--.---");
  expect(formatLapTime(undefined)).toBe("--:--.---");
  expect(formatLapTime(65.4321)).toBe("1:05.432");
});

it("formats deltas with sign", () => {
  expect(formatDelta(1.5)).toBe("+1.500");
  expect(formatDelta(-1.5, 1)).toBe("−1.5");
  expect(formatDelta(0)).toBe("±0.000");
});

it("has a label per wetness level", () => {
  expect(WETNESS_LABELS[1]).toBe("Dry");
  expect(WETNESS_LABELS).toHaveLength(8);
});

it("formats a recording timestamp, tolerating missing or bad input", () => {
  expect(formatDateTime("2025-12-29T09:20:00Z")).toMatch(/2025/);
  expect(formatDateTime(null)).toBe("");
  expect(formatDateTime(undefined)).toBe("");
  expect(formatDateTime("not a date")).toBe("");
});
