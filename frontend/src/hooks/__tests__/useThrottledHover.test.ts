import { act, renderHook } from "@testing-library/react";
import { useThrottledHover } from "../useThrottledHover";

it("coalesces updates to one per frame", () => {
  let cb: FrameRequestCallback = () => {};
  const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation((f) => {
    cb = f;
    return 1;
  });
  const { result } = renderHook(() => useThrottledHover());
  act(() => {
    result.current.setHoverIndex(1);
    result.current.setHoverIndex(2);
  });
  expect(raf).toHaveBeenCalledTimes(1);
  expect(result.current.hoverIndex).toBeNull();
  act(() => cb(0));
  expect(result.current.hoverIndex).toBe(2);
  act(() => result.current.clearHover());
  expect(result.current.hoverIndex).toBeNull();
  raf.mockRestore();
});
