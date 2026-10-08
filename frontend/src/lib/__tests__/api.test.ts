import { api } from "../api";

describe("api", () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });
  const ok = (body: unknown) => ({ ok: true, json: async () => body });

  it("loads the demo", async () => {
    fetchMock.mockResolvedValue(ok({ id: "x" }));
    await expect(api.loadDemo()).resolves.toEqual({ id: "x" });
    expect(fetchMock).toHaveBeenCalledWith("/api/sessions/demo", { method: "POST" });
  });
  it("uploads a file", async () => {
    fetchMock.mockResolvedValue(ok({ id: "y" }));
    await api.upload(new File(["a"], "a.ibt"));
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });
  it("compares laps", async () => {
    fetchMock.mockResolvedValue(ok({}));
    const signal = new AbortController().signal;
    await api.compare({ sessionId: "a", lap: 1 }, { sessionId: "b", lap: 2 }, signal);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/compare?ref_session=a&ref_lap=1&cmp_session=b&cmp_lap=2");
    expect(fetchMock.mock.calls[0][1]).toEqual({ signal });
  });
  it("uses the detail message of an error body", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, statusText: "Bad", json: async () => ({ detail: "nope" }) });
    await expect(api.loadDemo()).rejects.toThrow("nope");
  });
  it("keeps the status text for non-string detail or non-JSON bodies", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 422, statusText: "Unprocessable", json: async () => ({ detail: [] }) });
    await expect(api.loadDemo()).rejects.toThrow("422 Unprocessable");
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Boom",
      json: async () => {
        throw new Error("not json");
      },
    });
    await expect(api.loadDemo()).rejects.toThrow("500 Boom");
  });
});
