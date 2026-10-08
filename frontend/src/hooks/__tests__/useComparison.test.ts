import { renderHook, waitFor } from "@testing-library/react";
import { api } from "../../lib/api";
import { makeComparison } from "../../test/fixtures";
import { useComparison } from "../useComparison";

jest.mock("../../lib/api", () => ({ api: { compare: jest.fn() } }));

const compare = api.compare as jest.Mock;
const sel = { ref: { sessionId: "a", lap: 1 }, cmp: { sessionId: "a", lap: 2 } };
beforeEach(() => compare.mockReset());

it("does nothing without both laps", () => {
  const { result } = renderHook(() =>
    useComparison({ ref: null, cmp: null }, { onLoaded: jest.fn(), onError: jest.fn() }),
  );
  expect(result.current).toBeNull();
  expect(compare).not.toHaveBeenCalled();
});

it("loads the comparison", async () => {
  const c = makeComparison();
  compare.mockResolvedValue(c);
  const onLoaded = jest.fn();
  const { result } = renderHook(() => useComparison(sel, { onLoaded, onError: jest.fn() }));
  await waitFor(() => expect(result.current).toBe(c));
  expect(onLoaded).toHaveBeenCalled();
});

it("reports errors, including non-Error rejections", async () => {
  const onError = jest.fn();
  compare.mockRejectedValueOnce(new Error("x"));
  renderHook(() => useComparison(sel, { onLoaded: jest.fn(), onError }));
  await waitFor(() => expect(onError).toHaveBeenCalledWith("x"));
  compare.mockRejectedValueOnce("y");
  renderHook(() => useComparison({ ...sel }, { onLoaded: jest.fn(), onError }));
  await waitFor(() => expect(onError).toHaveBeenCalledWith("y"));
});

it("ignores errors from aborted requests", async () => {
  const onError = jest.fn();
  let reject!: (e: Error) => void;
  compare.mockReturnValue(new Promise((_, r) => (reject = r)));
  const { unmount } = renderHook(() => useComparison(sel, { onLoaded: jest.fn(), onError }));
  unmount();
  reject(new Error("aborted"));
  await Promise.resolve();
  await Promise.resolve();
  expect(onError).not.toHaveBeenCalled();
});
