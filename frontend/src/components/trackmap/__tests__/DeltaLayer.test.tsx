import { render } from "@testing-library/react";
import { makeComparison } from "../../../test/fixtures";
import { DeltaLayer } from "../DeltaLayer";
import { buildTrackGeometry } from "../geometry";

const c = makeComparison();
const g = buildTrackGeometry(c)!;
const props = { points: g.points, segments: g.segments, comparison: c };

it("draws corner labels, with and without a zoom highlight", () => {
  const { container, rerender } = render(<svg><DeltaLayer {...props} zoomLo={null} zoomHi={null} /></svg>);
  expect(container.querySelectorAll("text")).toHaveLength(2);
  const before = container.querySelectorAll("path").length;
  rerender(<svg><DeltaLayer {...props} zoomLo={2} zoomHi={5} /></svg>);
  expect(container.querySelectorAll("path").length).toBe(before + 1);
  rerender(<svg><DeltaLayer {...props} zoomLo={2} zoomHi={null} /></svg>);
  expect(container.querySelectorAll("path").length).toBe(before);
});
