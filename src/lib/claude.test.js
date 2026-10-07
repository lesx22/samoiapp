import { describe, it, expect, vi, afterEach } from "vitest";
import { callClaude } from "./claude";

vi.mock("./supabase", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "user-token" } } }) } },
}));

afterEach(() => vi.unstubAllGlobals());

describe("callClaude", () => {
  it("calls the proxy with the login token and never sends an API key", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ content: [{ type: "text", text: "hello" }] })));
    vi.stubGlobal("fetch", fetchMock);

    const text = await callClaude("sys", [{ role: "user", content: "hi" }], { maxTokens: 500 });

    expect(text).toBe("hello");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/claude");
    expect(init.headers.Authorization).toBe("Bearer user-token");
    expect(init.headers["x-api-key"]).toBeUndefined();
    expect(JSON.parse(init.body)).toEqual({ system: "sys", messages: [{ role: "user", content: "hi" }], maxTokens: 500 });
  });

  it("surfaces proxy errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"Not signed in"}', { status: 401 })));
    await expect(callClaude("sys", [{ role: "user", content: "hi" }])).rejects.toThrow(/API 401/);
  });
});
