import { makeCorner } from "../../test/fixtures";
import { worstCorner } from "../corners";

it("finds the worst corner", () => {
  expect(worstCorner([])).toBeUndefined();
  const a = makeCorner({ number: 1, time_delta: 0.1 });
  const b = makeCorner({ number: 2, time_delta: 0.3 });
  expect(worstCorner([a, b, a])).toBe(b);
});
