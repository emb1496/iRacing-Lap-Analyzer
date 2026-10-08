import type { Comparison, LapSelection, SessionSummary } from "./types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // non-JSON error body; keep the status text
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  loadDemo: () => request<SessionSummary>("/api/sessions/demo", { method: "POST" }),

  upload: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<SessionSummary>("/api/sessions", { method: "POST", body });
  },

  compare: (ref: LapSelection, cmp: LapSelection, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      ref_session: ref.sessionId,
      ref_lap: String(ref.lap),
      cmp_session: cmp.sessionId,
      cmp_lap: String(cmp.lap),
    });
    return request<Comparison>(`/api/compare?${params}`, { signal });
  },
};
