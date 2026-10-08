import { makeConditions } from "../../../test/fixtures";
import { BANDS, heat, loggedTyreCorners, TYRE_GRID, tyreScale } from "../tyres";

it("lays out the grid and bands", () => {
  expect(TYRE_GRID.flat()).toEqual(["LF", "RF", "LR", "RR"]);
  expect(BANDS.L[0]).toBe("outer");
  expect(BANDS.R[0]).toBe("inner");
});

it("finds logged corners and scale", () => {
  const a = makeConditions();
  const b = makeConditions({ tyres: { LF: a.tyres.LF } });
  expect(loggedTyreCorners(a, b)).toEqual(["LF"]);
  expect(tyreScale(a, b)).toEqual([80, 90]);
});

it("maps cool to blue and hot to red", () => {
  expect(heat(0)).toBe("hsl(220 62% 30%)");
  expect(heat(1)).toBe("hsl(0 62% 30%)");
});
