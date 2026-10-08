import { act, renderHook } from "@testing-library/react";
import type { DragEvent } from "react";
import { useDropzone } from "../useDropzone";

const ev = (files: File[] = []) =>
  ({ preventDefault: jest.fn(), dataTransfer: { files } }) as unknown as DragEvent;

it("tracks dragging and passes the dropped file", () => {
  const onFile = jest.fn();
  const { result } = renderHook(() => useDropzone(onFile));
  act(() => result.current.handlers.onDragOver(ev()));
  expect(result.current.dragging).toBe(true);
  act(() => result.current.handlers.onDragLeave());
  expect(result.current.dragging).toBe(false);
  const f = new File(["a"], "a.ibt");
  act(() => result.current.handlers.onDragOver(ev()));
  act(() => result.current.handlers.onDrop(ev([f])));
  expect(result.current.dragging).toBe(false);
  expect(onFile).toHaveBeenCalledWith(f);
  act(() => result.current.handlers.onDrop(ev([])));
  expect(onFile).toHaveBeenCalledTimes(1);
});
