import { cornerRange, indexAt } from "../range";

it("clamps indexes", () => {
  expect(indexAt(500, 1000, 11)).toBe(5);
  expect(indexAt(-5, 1000, 11)).toBe(0);
  expect(indexAt(5000, 1000, 11)).toBe(10);
});

it("pads corner ranges", () => {
  expect(cornerRange({ start: 100, end: 200 }, 1000)).toEqual([50, 250]);
  expect(cornerRange({ start: 10, end: 20 }, 50)).toEqual([0, 50]);
});
