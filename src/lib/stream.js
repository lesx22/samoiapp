// Reads Anthropic's streamed answer (server-sent events) as it arrives.
// Calls onText with the answer so far, and onSearch when a web search starts.
// Resolves with the final text and the pages it cited.
export async function readAnswerStream(body, { onText, onSearch } = {}) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const sources = new Map();

  function handle(event) {
    if (event.type === "error") {
      throw new Error(`${event.error?.type || "stream_error"}: ${event.error?.message || "unknown"}`);
    }
    if (event.type === "content_block_start" && event.content_block?.type === "server_tool_use") {
      onSearch?.();
    }
    if (event.type === "content_block_delta") {
      const d = event.delta;
      if (d.type === "text_delta") {
        text += d.text;
        onText?.(text);
      }
      if (d.type === "citations_delta" && d.citation?.url && !sources.has(d.citation.url)) {
        sources.set(d.citation.url, { url: d.citation.url, title: d.citation.title || d.citation.url });
      }
    }
  }

  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    // Events are separated by a blank line; keep any partial event for the next chunk
    const parts = buffer.split("\n\n");
    buffer = done ? "" : parts.pop();
    for (const part of parts) {
      const data = part.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join("");
      if (data) handle(JSON.parse(data));
    }
    if (done) break;
  }

  return { text, sources: [...sources.values()] };
}
