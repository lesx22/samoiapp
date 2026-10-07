// The model sometimes writes "• item • item" inside a paragraph. Put each
// bullet on its own line so it renders as a real list.
export function tidyBullets(text) {
  if (!text.includes("•")) return text;
  const lines = text.replace(/[ \t]*•[ \t]*/g, "\n- ").split("\n");
  const out = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    const isItem = line.startsWith("- ");
    const prevIsItem = prev?.startsWith("- ");
    // A list needs a blank line before it, and so does text after it
    if (prev && prev.trim() && line.trim() && isItem !== prevIsItem) out.push("");
    out.push(line);
  }
  return out.join("\n").replace(/^\n+/, "");
}
