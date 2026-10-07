// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./claude";

const SUPABASE_URL = "https://project.supabase.co";

function request(body, token = "user-token") {
  return new Request("http://localhost/api/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const validBody = { system: "sys", messages: [{ role: "user", content: "hi" }], maxTokens: 500 };

describe("POST /api/claude", () => {
  let fetchMock;

  beforeEach(() => {
    vi.stubEnv("ANTHROPIC_API_KEY", "server-key");
    vi.stubEnv("VITE_SUPABASE_URL", SUPABASE_URL);
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    fetchMock = vi.fn(async url => {
      if (url.startsWith(SUPABASE_URL)) return new Response("{}", { status: 200 });
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects requests with no login token and never calls Anthropic", async () => {
    const res = await POST(request(validBody, null));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects tokens Supabase doesn't recognise", async () => {
    fetchMock.mockImplementationOnce(async () => new Response("{}", { status: 401 }));
    const res = await POST(request(validBody, "bad-token"));
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forwards signed-in requests with the server key, fixed model, and capped tokens", async () => {
    const res = await POST(request({ ...validBody, maxTokens: 999999 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ content: [{ type: "text", text: "ok" }] });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("server-key");
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe("claude-sonnet-4-6");
    expect(sent.max_tokens).toBe(8000);
    expect(sent.messages).toEqual(validBody.messages);
  });

  it("uses the cheaper model for chat", async () => {
    await POST(request({ ...validBody, purpose: "chat" }));
    const sent = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(sent.model).toBe("claude-haiku-4-5-20251001");
  });

  it("refuses any purpose it doesn't know, so the browser can't pick a model", async () => {
    const res = await POST(request({ ...validBody, purpose: "claude-opus-4-1" }));
    expect(res.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the login check
  });

  it("passes rate limits through with retry-after", async () => {
    fetchMock.mockImplementation(async url => url.startsWith(SUPABASE_URL)
      ? new Response("{}", { status: 200 })
      : new Response("{}", { status: 429, headers: { "retry-after": "12" } }));
    const res = await POST(request(validBody));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("12");
  });

  it("returns 400 for a malformed body", async () => {
    expect((await POST(request("not json"))).status).toBe(400);
    expect((await POST(request({ messages: [] }))).status).toBe(400);
  });

  it("fails clearly when the server key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(request(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/ANTHROPIC_API_KEY/);
  });
});
