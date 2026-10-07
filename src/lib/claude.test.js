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
    expect(JSON.parse(init.body)).toEqual({ system: "sys", messages: [{ role: "user", content: "hi" }], maxTokens: 500, purpose: "plant" });
  });

  it("surfaces proxy errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"Not signed in"}', { status: 401 })));
    await expect(callClaude("sys", [{ role: "user", content: "hi" }])).rejects.toThrow(/API 401/);
  });
});

describe("prompts use the real current date", () => {
  afterEach(() => vi.useRealTimers());

  it("formats today as a plain English date", async () => {
    const { todayLabel } = await import("./claude");
    expect(todayLabel(new Date(2026, 9, 7))).toBe("7 October 2026");
  });

  it("puts today's date into the plant prompt and never the old fixed date", async () => {
    const { seedSystemPrompt } = await import("./claude");
    const prompt = seedSystemPrompt("7 October 2026");
    expect(prompt).toContain("TODAY: 7 October 2026.");
    expect(prompt).not.toContain("April 5 2026");
  });

  it("tells the plant chat what day it is", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 7));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ content: [{ type: "text", text: "ok" }] })));
    vi.stubGlobal("fetch", fetchMock);
    const { chatAboutPlant } = await import("./claude");

    await chatAboutPlant("Tomato", [{ role: "user", content: "When do I prune?" }]);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).system).toContain("Today is 7 October 2026.");
  });
});

describe("chatAboutPlant", () => {
  it("asks the server for the chat model and streams the answer", async () => {
    const { chatAboutPlant } = await import("./claude");
    const sse = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Water weekly."}}\n\n';
    const fetchMock = vi.fn(async () => new Response(sse, { headers: { "Content-Type": "text/event-stream" } }));
    vi.stubGlobal("fetch", fetchMock);
    const reply = await chatAboutPlant("Celosia", [{ role: "user", content: "How often?" }]);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.purpose).toBe("chat");
    expect(sent.stream).toBe(true);
    expect(reply.text).toBe("Water weekly.");
  });
});

