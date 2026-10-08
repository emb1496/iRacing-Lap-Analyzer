import { makeComparison, makeTrace } from "../../../test/fixtures";
import { buildTrackGeometry, lineViewBox, path } from "../geometry";

it("builds a path", () => {
  expect(path([[1, 2], [3.14159, 4]])).toBe("M1.0,2.0L3.1,4.0");
});

it("returns null without GPS", () => {
  const c = makeComparison({ ref_trace: makeTrace({ lat: null, lon: null }) });
  expect(buildTrackGeometry(c)).toBeNull();
});

it("projects both laps and colours segments", () => {
  const g = buildTrackGeometry(makeComparison())!;
  expect(g.points).toHaveLength(11);
  expect(g.cmpPoints).toHaveLength(11);
  expect(g.gaps).toHaveLength(11);
  expect(g.segments.length).toBeGreaterThan(0);
});

it("colours losing, gaining and neutral stretches", () => {
  const distance = Array.from({ length: 11 }, (_, i) => i * 100);
  const loss = buildTrackGeometry(makeComparison({ delta: distance.map((d) => d * 0.01) }))!;
  expect(loss.segments[0].color).toMatch(/^rgba\(255, 92, 92/);
  const gain = buildTrackGeometry(makeComparison({ delta: distance.map((d) => -d * 0.01) }))!;
  expect(gain.segments[0].color).toMatch(/^rgba\(46, 204, 113/);
  const flat = buildTrackGeometry(makeComparison({ delta: distance.map(() => 0) }))!;
  expect(flat.segments[0].color).toBe("var(--neutral-track)");
});

it("works without comparison GPS and with a degenerate track", () => {
  const g = buildTrackGeometry(makeComparison({ cmp_trace: makeTrace({ lat: null, lon: null }) }))!;
  expect(g.cmpPoints).toBeNull();
  expect(g.gaps).toBeNull();
  const still = makeTrace({ lat: Array(11).fill(50), lon: Array(11).fill(5) });
  expect(buildTrackGeometry(makeComparison({ ref_trace: still }))!.scale).toBeGreaterThan(0);
});

it("frames the line view", () => {
  const pts: [number, number][] = [[0, 0], [100, 0], [100, 100]];
  const box = lineViewBox(pts, pts, [0, 2], 1).split(" ").map(Number);
  expect(box[2]).toBeCloseTo(130);
  expect(box[3]).toBeCloseTo(130);
  const tiny = lineViewBox([[0, 0]], [[0, 0]], [0, 0], 2).split(" ").map(Number);
  expect(tiny[2]).toBeCloseTo(104);
});
