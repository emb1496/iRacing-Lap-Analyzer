import { PX } from "../constants";

it("keeps strokes at screen pixel width", () => {
  expect(PX.vectorEffect).toBe("non-scaling-stroke");
});
