import { describe, it, expect, vi } from "vitest";
import { readAnswerStream } from "./stream";

// Builds a stream that delivers the given strings as separate chunks
function streamOf(chunks) {
  const enc = new TextEncoder();
  return new ReadableStream({ start(c) { chunks.forEach(x => c.enqueue(enc.encode(x))); c.close(); } });
}
const ev = data => `event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`;

describe("readAnswerStream", () => {
  it("builds the answer from text pieces, even when an event is split across chunks", async () => {
    const all = ev({ type: "content_block_start", content_block: { type: "server_tool_use" } })
      + ev({ type: "content_block_delta", delta: { type: "text_delta", text: "Cut in " } })
      + ev({ type: "content_block_delta", delta: { type: "citations_delta", citation: { url: "https://rhs.org.uk/a", title: "RHS" } } })
      + ev({ type: "content_block_delta", delta: { type: "text_delta", text: "the morning." } })
      + ev({ type: "content_block_delta", delta: { type: "citations_delta", citation: { url: "https://rhs.org.uk/a", title: "RHS" } } })
      + ev({ type: "message_stop" });
    const cut = Math.floor(all.length / 2);
    const onText = vi.fn();
    const onSearch = vi.fn();

    const result = await readAnswerStream(streamOf([all.slice(0, cut), all.slice(cut)]), { onText, onSearch });

    expect(result).toEqual({ text: "Cut in the morning.", sources: [{ url: "https://rhs.org.uk/a", title: "RHS" }] });
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenLastCalledWith("Cut in the morning.");
  });

  it("fails when Anthropic sends an error mid-stream", async () => {
    const body = streamOf([ev({ type: "error", error: { type: "overloaded_error", message: "Overloaded" } })]);
    await expect(readAnswerStream(body)).rejects.toThrow(/overloaded_error/);
  });
});
