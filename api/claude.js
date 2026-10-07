// ─── Claude proxy ─────────────────────────────────────────────────────────────
// Holds the Anthropic key server-side so it never ships to the browser.
// Only signed-in Supabase users can call it, and the model and tools are fixed
// here so the endpoint can't be used for anything the app doesn't do.

// The browser says what the call is for; the server picks the model. Chat uses
// the faster, cheaper model; adding plants keeps the stronger one for accuracy.
const MODELS = {
  plant: "claude-sonnet-4-6",
  chat: "claude-haiku-4-5-20251001",
};
const MAX_TOKENS_LIMIT = 8000;

function json(status, body) {
  return Response.json(body, { status });
}

async function isSignedIn(request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  return res.ok;
}

export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(500, { error: "ANTHROPIC_API_KEY is not set on the server" });
  }
  if (!(await isSignedIn(request))) {
    return json(401, { error: "Not signed in" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const { system, messages, maxTokens, purpose = "plant" } = body;
  const model = MODELS[purpose];
  if (!model) {
    return json(400, { error: "purpose must be plant or chat" });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: "messages must be a non-empty array" });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: Math.min(Number(maxTokens) || MAX_TOKENS_LIMIT, MAX_TOKENS_LIMIT),
      system,
      messages,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  // Pass Anthropic's response straight through, keeping retry-after for 429s
  const headers = { "Content-Type": "application/json" };
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) headers["retry-after"] = retryAfter;
  return new Response(await upstream.text(), { status: upstream.status, headers });
}
