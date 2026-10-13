import { act, renderHook, waitFor } from "@testing-library/react";
import { api } from "../../lib/api";
import { useLibrary } from "../useLibrary";

jest.mock("../../lib/api", () => ({ api: { library: jest.fn() } }));
const library = api.library as jest.Mock;

it("loads the library on mount and can rescan", async () => {
  library.mockResolvedValue({ directory: "/t", files: [] });
  const { result } = renderHook(() => useLibrary());
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.library).toEqual({ directory: "/t", files: [] });

  library.mockResolvedValue({ directory: "/t2", files: [] });
  await act(() => result.current.refresh());
  expect(result.current.library?.directory).toBe("/t2");
});

it("treats a failed lookup as no folder", async () => {
  library.mockRejectedValue(new Error("down"));
  const { result } = renderHook(() => useLibrary());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.library).toEqual({ directory: null, files: [] });
});
