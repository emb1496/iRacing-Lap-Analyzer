import { render } from "@testing-library/react";
import { makeComparison } from "../../../test/fixtures";
import { buildTrackGeometry } from "../geometry";
import { LineLayer } from "../LineLayer";

it("draws the base and both laps", () => {
  const g = buildTrackGeometry(makeComparison())!;
  const { container } = render(<svg><LineLayer points={g.points} cmpPoints={g.cmpPoints!} /></svg>);
  expect(container.querySelectorAll("path")).toHaveLength(3);
});
