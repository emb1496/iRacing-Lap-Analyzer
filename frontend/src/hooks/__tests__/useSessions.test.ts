import { act, renderHook } from "@testing-library/react";
import { makeSession } from "../../test/fixtures";
import { useSessions } from "../useSessions";

it("selects best vs latest on first load", async () => {
  const { result } = renderHook(() => useSessions());
  await act(() => result.current.addSession(async () => makeSession()));
  expect(result.current.sessions).toHaveLength(1);
  expect(result.current.selection).toEqual({
    ref: { sessionId: "s1", lap: 1 },
    cmp: { sessionId: "s1", lap: 2 },
  });
  expect(result.current.busy).toBe(false);
});

it("falls back to the first valid lap when there is no best lap, and null without laps", async () => {
  const { result } = renderHook(() => useSessions());
  await act(() => result.current.addSession(async () => makeSession({ best_lap: null })));
  expect(result.current.selection.ref).toEqual({ sessionId: "s1", lap: 1 });
  const empty = renderHook(() => useSessions());
  await act(() => empty.result.current.addSession(async () => makeSession({ best_lap: null, laps: [] })));
  expect(empty.result.current.selection).toEqual({ ref: null, cmp: null });
});

it("compares a second file's best lap against the reference", async () => {
  const { result } = renderHook(() => useSessions());
  await act(() => result.current.addSession(async () => makeSession()));
  await act(() => result.current.addSession(async () => makeSession({ id: "s2", best_lap: 7 })));
  expect(result.current.selection.cmp).toEqual({ sessionId: "s2", lap: 7 });
  await act(() => result.current.addSession(async () => makeSession({ id: "s3", best_lap: null })));
  expect(result.current.selection.cmp).toEqual({ sessionId: "s2", lap: 7 });
});

it("reports errors", async () => {
  const { result } = renderHook(() => useSessions());
  await act(() => result.current.addSession(() => Promise.reject(new Error("bad"))));
  expect(result.current.error).toBe("bad");
  await act(() => result.current.addSession(() => Promise.reject("str")));
  expect(result.current.error).toBe("str");
  act(() => result.current.setError(null));
  expect(result.current.error).toBeNull();
});

it("picks laps", () => {
  const { result } = renderHook(() => useSessions());
  act(() => result.current.pick("cmp", { sessionId: "z", lap: 4 }));
  expect(result.current.selection.cmp).toEqual({ sessionId: "z", lap: 4 });
});
