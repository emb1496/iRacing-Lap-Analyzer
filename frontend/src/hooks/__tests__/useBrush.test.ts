import { act, renderHook } from "@testing-library/react";
import type { Row } from "../../components/charts/chartRows";
import { useBrush } from "../useBrush";

const rows = Array.from({ length: 11 }, (_, i) => ({ d: i * 100 }) as Row);
const state = (i: number | string | null | undefined) => ({ activeTooltipIndex: i }) as never;

function setup(onZoom = jest.fn(), onHover = jest.fn()) {
  const hook = renderHook(() => useBrush({ rows, domain: [0, 1000], onHover, onZoom }));
  const root = document.createElement("div");
  Object.defineProperty(root, "clientWidth", { value: 664 });
  Object.defineProperty(root, "clientHeight", { value: 500 });
  const bar = document.createElement("div");
  Object.defineProperty(bar, "offsetHeight", { value: 30 });
  const brush = document.createElement("div");
  (hook.result.current.chartsEl as { current: unknown }).current = root;
  (hook.result.current.barEl as { current: unknown }).current = bar;
  (hook.result.current.brushEl as { current: unknown }).current = brush;
  return { ...hook, brush, onZoom, onHover };
}

it("zooms on a long drag and paints the overlay", () => {
  const { result, brush, onZoom, onHover } = setup();
  act(() => result.current.handlers.onMouseDown(state(2)));
  expect(result.current.dragging).toBe(true);
  expect(brush.style.display).toBe("none");
  act(() => result.current.handlers.onMouseMove(state("5")));
  expect(onHover).toHaveBeenLastCalledWith(5);
  expect(brush.style.display).toBe("block");
  expect(brush.style.top).toBe("30px");
  expect(brush.style.height).toBe("470px");
  act(() => result.current.commitDrag());
  expect(onZoom).toHaveBeenCalledWith([200, 500]);
  expect(result.current.dragging).toBe(false);
});

it("ignores short drags, missing indexes, and ends on window mouseup", () => {
  const { result, onZoom, onHover } = setup();
  act(() => result.current.handlers.onMouseDown(state(null)));
  expect(result.current.dragging).toBe(false);
  act(() => result.current.handlers.onMouseMove(state(undefined)));
  expect(onHover).toHaveBeenLastCalledWith(null);
  act(() => result.current.handlers.onMouseDown(state(3)));
  act(() => result.current.handlers.onMouseMove(state(3)));
  act(() => {
    window.dispatchEvent(new MouseEvent("mouseup"));
  });
  expect(onZoom).not.toHaveBeenCalled();
  expect(result.current.dragging).toBe(false);
  act(() => result.current.handlers.onMouseLeave());
  expect(onHover).toHaveBeenLastCalledWith(null);
  act(() => result.current.commitDrag());
});

it("tolerates missing elements", () => {
  const hook = renderHook(() => useBrush({ rows, domain: [0, 1000], onHover: jest.fn(), onZoom: jest.fn() }));
  act(() => hook.result.current.handlers.onMouseDown(state(1)));
  const root = document.createElement("div");
  (hook.result.current.chartsEl as { current: unknown }).current = root;
  (hook.result.current.brushEl as { current: unknown }).current = document.createElement("div");
  act(() => hook.result.current.handlers.onMouseMove(state(4)));
});
