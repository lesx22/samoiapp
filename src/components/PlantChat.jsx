import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { chatAboutPlant } from "../lib/claude";
import { tidyBullets } from "../lib/markdown";

// ─── Plant chat ───────────────────────────────────────────────────────────────
// Conversation is kept per plant in this browser. Answers are Markdown with
// web search sources listed under them.

const MAX_SOURCES = 4;

// Links in answers open in a new tab; Markdown is rendered without raw HTML
const markdownComponents = {
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
};

export default function PlantChat({ seed }) {
  const storageKey = `jardin-chat-${seed.id}`;
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState(null); // answer being streamed in: { text, searching }
  const bottomRef = useRef();
  const inputRef = useRef();

  // Jump to the newest message when one is sent or finishes
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  // While an answer streams in, follow it only if the reader is already at the bottom
  useEffect(() => {
    if (!draft) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
    if (nearBottom) bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [draft]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); }
    catch { /* storage full or blocked */ }
  }, [messages, storageKey]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);
    setDraft({ text: "", searching: false });

    try {
      const reply = await chatAboutPlant(seed.name, newMessages.map(m => ({ role: m.role, content: m.content })), {
        onText: text => setDraft(d => ({ ...d, text, searching: false })),
        onSearch: () => setDraft(d => ({ ...d, searching: true })),
      });
      setMessages(prev => [...prev, { role: "assistant", content: reply.text, sources: reply.sources }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't get an answer just now. Please try again.", failed: true }]);
    } finally {
      setDraft(null);
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const plantLabel = `${seed.name}${seed.variety && seed.variety !== "Standard" ? ` '${seed.variety}'` : ""}`;

  return (
    <div className="chat">
      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-bubble chat-bubble--assistant">
            <p>Hi, I'm your assistant for {plantLabel}. Ask me anything about growing it in your garden.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-row chat-row--${msg.role}`}>
            <div className={`chat-bubble chat-bubble--${msg.role}${msg.failed ? " chat-bubble--failed" : ""}`}>
              {msg.role === "assistant"
                ? <div className="chat-md"><Markdown components={markdownComponents}>{tidyBullets(msg.content)}</Markdown></div>
                : <p>{msg.content}</p>}
            </div>
            {msg.sources?.length > 0 && <Sources sources={msg.sources} />}
          </div>
        ))}

        {loading && draft?.text && (
          <div className="chat-row chat-row--assistant">
            <div className="chat-bubble chat-bubble--assistant">
              <div className="chat-md"><Markdown components={markdownComponents}>{tidyBullets(draft.text)}</Markdown></div>
            </div>
          </div>
        )}

        {loading && (!draft?.text || draft.searching) && (
          <div className="chat-row chat-row--assistant">
            <div className="chat-bubble chat-bubble--assistant chat-thinking" role="status">
              <span className="typing-dots" aria-hidden="true"><span /><span /><span /></span>
              <span>{draft?.searching ? "Searching the web…" : "Thinking…"}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="chat-end" />
      </div>

      <form className="chat-composer" onSubmit={e => { e.preventDefault(); send(); }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Ask about your ${seed.name}…`}
          aria-label={`Ask about your ${seed.name}`}
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={!input.trim() || loading}>
          Send
        </button>
      </form>
    </div>
  );
}

function Sources({ sources }) {
  // One link per site, so two pages from the same site don't repeat
  const bySite = new Map();
  for (const s of sources) if (!bySite.has(hostOf(s.url))) bySite.set(hostOf(s.url), s);
  return (
    <div className="chat-sources">
      <span className="chat-sources__label">Sources</span>
      {[...bySite].slice(0, MAX_SOURCES).map(([host, s]) => (
        <a key={host} href={s.url} target="_blank" rel="noreferrer" title={s.title} className="chat-source">
          {host}
        </a>
      ))}
    </div>
  );
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}
