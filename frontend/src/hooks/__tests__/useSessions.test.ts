import { act, renderHook } from "@testing-library/react";
import { makeSession } from "../../test/fixtures";
import { canCompare, useSessions } from "../useSessions";

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

describe("chooseFile", () => {
  const s1 = makeSession({ id: "s1", filename: "a.ibt", best_lap: 1 });
  const s2 = makeSession({ id: "s2", filename: "b.ibt", best_lap: 2 });
  const other = makeSession({ id: "s3", filename: "c.ibt", car: "Other car" });
  const load = (s: ReturnType<typeof makeSession>) => jest.fn(async () => s);

  it("same file for both sides (the default) loads once and picks best vs latest", async () => {
    const { result } = renderHook(() => useSessions());
    const loader = load(s1);
    await act(() => result.current.chooseFile("ref", "a.ibt", loader));
    expect(result.current.sameFile).toBe(true);
    expect(result.current.selection).toEqual({
      ref: { sessionId: "s1", lap: 1 },
      cmp: { sessionId: "s1", lap: 2 },
    });
    await act(() => result.current.chooseFile("ref", "a.ibt", loader));
    expect(loader).toHaveBeenCalledTimes(1);
    expect(result.current.sessions).toHaveLength(1);
  });

  it("picking a second file for the comparison turns off same-file", async () => {
    const { result } = renderHook(() => useSessions());
    await act(() => result.current.chooseFile("ref", "a.ibt", load(s1)));
    await act(() => result.current.chooseFile("cmp", "b.ibt", load(s2)));
    expect(result.current.sameFile).toBe(false);
    expect(result.current.selection.ref).toEqual({ sessionId: "s1", lap: 1 });
    expect(result.current.selection.cmp).toEqual({ sessionId: "s2", lap: 2 });
  });

  it("picking the reference file as the comparison uses a different lap", async () => {
    const { result } = renderHook(() => useSessions());
    await act(() => result.current.chooseFile("ref", "a.ibt", load(s1)));
    act(() => result.current.pick("ref", { sessionId: "s1", lap: 2 }));
    await act(() => result.current.chooseFile("cmp", "a.ibt", load(s1)));
    expect(result.current.sameFile).toBe(true);
    expect(result.current.selection.cmp).toEqual({ sessionId: "s1", lap: 1 });
  });

  it("with same-file off, a new reference keeps a compatible comparison and drops an incompatible one", async () => {
    const { result } = renderHook(() => useSessions());
    await act(() => result.current.chooseFile("ref", "a.ibt", load(s1)));
    await act(() => result.current.chooseFile("cmp", "b.ibt", load(s2)));
    // same track and car: the comparison stays
    await act(() => result.current.chooseFile("ref", "a.ibt", load(s1)));
    expect(result.current.selection.cmp).toEqual({ sessionId: "s2", lap: 2 });
    // different car: the comparison is cleared
    await act(() => result.current.chooseFile("ref", "c.ibt", load(other)));
    expect(result.current.selection.ref?.sessionId).toBe("s3");
    expect(result.current.selection.cmp).toBeNull();
  });

  it("with same-file off and no comparison yet, a new reference leaves it empty", async () => {
    const { result } = renderHook(() => useSessions());
    act(() => result.current.setSameFile(false));
    await act(() => result.current.chooseFile("ref", "a.ibt", load(s1)));
    expect(result.current.selection.cmp).toBeNull();
  });

  it("turning same-file back on points the comparison at the reference file", async () => {
    const { result } = renderHook(() => useSessions());
    await act(() => result.current.chooseFile("ref", "a.ibt", load(s1)));
    await act(() => result.current.chooseFile("cmp", "b.ibt", load(s2)));
    act(() => result.current.setSameFile(true));
    expect(result.current.selection.cmp).toEqual({ sessionId: "s1", lap: 2 });
    act(() => result.current.setSameFile(false));
    expect(result.current.selection.cmp).toEqual({ sessionId: "s1", lap: 2 });
  });

  it("turning same-file on with nothing chosen changes nothing", () => {
    const { result } = renderHook(() => useSessions());
    act(() => result.current.setSameFile(true));
    expect(result.current.selection).toEqual({ ref: null, cmp: null });
  });

  it("reports a failed load", async () => {
    const { result } = renderHook(() => useSessions());
    await act(() => result.current.chooseFile("ref", "a.ibt", () => Promise.reject(new Error("bad"))));
    expect(result.current.error).toBe("bad");
    expect(result.current.sessions).toHaveLength(0);
  });
});

it("an uploaded second file switches off same-file; the same session again does not", async () => {
  const { result } = renderHook(() => useSessions());
  await act(() => result.current.addSession(async () => makeSession()));
  expect(result.current.sameFile).toBe(true);
  await act(() => result.current.addSession(async () => makeSession({ id: "s2", best_lap: 7 })));
  expect(result.current.sameFile).toBe(false);
});

it("compares only the same track and car", () => {
  const a = { track: "Spa", car: "GT3" };
  expect(canCompare(a, { track: "Spa", car: "GT3" })).toBe(true);
  expect(canCompare(a, { track: "Monza", car: "GT3" })).toBe(false);
  expect(canCompare(a, { track: "Spa", car: "MX-5" })).toBe(false);
});
