// ─── Claude API ───────────────────────────────────────────────────────────────

export async function callClaude(system, messages, { maxTokens = 8000, _attempt = 0 } = {}) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  // Rate limited — wait and retry up to 3 times
  if (res.status === 429) {
    if (_attempt >= 3) {
      const txt = await res.text();
      throw new Error(`API 429 (rate limited after 3 retries): ${txt.slice(0, 200)}`);
    }
    const retryAfter = parseInt(res.headers.get("retry-after") || "60", 10);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return callClaude(system, messages, { maxTokens, _attempt: _attempt + 1 });
  }

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt.slice(0, 400)}`);
  }

  const d = await res.json();
  if (d.error) throw new Error(`${d.error.type}: ${d.error.message}`);

  const text = d.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  if (!text) {
    const types = d.content.map(b => b.type).join(", ");
    throw new Error(`No text in API response. stop_reason=${d.stop_reason}, content types=[${types}]`);
  }

  return text;
}

export function normaliseMime(type, filename) {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (type && ok.includes(type)) return type;
  const ext = (filename || "").split(".").pop().toLowerCase();
  const map = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    webp: "image/webp", gif: "image/gif", heic: "image/jpeg", heif: "image/jpeg",
  };
  return map[ext] || "image/jpeg";
}

export function extractJSON(raw) {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1)
    throw new Error(`No JSON found. Response preview: "${raw.slice(0, 200)}"`);
  try {
    return JSON.parse(raw.slice(s, e + 1));
  } catch (err) {
    throw new Error(`JSON parse error: ${err.message}. JSON preview: "${raw.slice(s, s + 300)}"`);
  }
}

// ─── Structured seed extraction system prompt ─────────────────────────────────

export const SEED_SYSTEM_PROMPT = `You are an expert horticulturist specialising in European home gardens and market growing.
LOCATION: Condé-en-Normandy, France. Zone: RHS H4 / USDA 8b. Oceanic Cfb climate.
TODAY: April 5 2026. Last frost ~mid-April. First frost ~early November. Plot 1/8 acre ~500m².
Gardener uses soil blocks, grows in-ground or raised beds.

Tasks:
- For image input: identify plant name, variety, brand from the packet photo.
- For text/name input: use the plant name given.
- For URL input: fetch that URL, read the product page, extract all data.
- Then: search manufacturer website + authoritative sources (RHS, extension services) for growing detail.
- Find 2-3 YouTube video search URLs relevant to growing this specific plant/variety.
- Calibrate ALL advice to Normandy zone, oceanic climate, April 5 2026.

CRITICAL: Return ONLY valid JSON. No markdown fences. No preamble. No trailing text after the closing brace.

JSON schema (use null for unknown fields):
{
  "name": "Common name",
  "variety": "Variety or Standard",
  "scientific": "Latin binomial",
  "brand": "Brand name",
  "category": "One of: Annual Flower | Perennial Flower | Bulb | Vegetable | Herb | Fruit | Tree/Shrub | Other",
  "plantType": "Specific type within category — e.g. Zinnia, Dahlia, Tomato, Courgette/Squash, Basil — or null",
  "brandWebsite": "Direct product page URL for this exact variety (not brand homepage) — e.g. https://trueleafmarket.com/products/tomato-seeds-oaxacan-jewel. null if not found.",
  "emoji": "One emoji",
  "color": "Dominant flower/foliage colour — one of: Pink | Coral pink | White | Yellow | Orange | Black | Multi | Green | Red | Purple | Blue | Grey | Lavender/Purple — or null",
  "description": "2-3 sentence overview",
  "zoneCompatibility": "e.g. USDA 4-9",
  "daysToMaturity": "e.g. 70 days",
  "startMethod": "Soil blocks / Direct sow / Either",
  "germinationTempC": "e.g. 21-29°C",
  "germinationDays": "e.g. 5-10 days",
  "sowMonths": [4,5],
  "transplantMonths": [5,6],
  "harvestMonths": [7,8,9],
  "currentAdvice": "Specific actionable paragraph for April 5 Normandy",
  "immediateNextStep": "Single most important action TODAY",
  "indoorCare": {
    "temperature": "e.g. 22-26C day 18C night",
    "light": "Hours and type",
    "watering": "Technique and frequency",
    "fertilizing": "When and what",
    "durationWeeks": 3,
    "potUpNeeded": false,
    "notes": "Soil block specific tips"
  },
  "hardeningOff": {
    "durationDays": 7,
    "method": "Step by step",
    "minNightTempC": 10,
    "warnings": "Chilling injury warnings"
  },
  "transplanting": {
    "soilTempMinC": 18,
    "targetDate": "e.g. late April to early May",
    "depth": "e.g. to soil block top",
    "spacing": "e.g. 60cm",
    "rowSpacing": "e.g. 150cm",
    "technique": "Detailed technique",
    "aftercare": "First 7 days"
  },
  "inGroundManagement": {
    "soilType": "Ideal soil",
    "soilPH": "e.g. 6.0-6.5",
    "amendments": "What to dig in",
    "mulching": "Type, depth, timing",
    "trellis": true,
    "trellisType": "Type or null",
    "trellisHeight": "e.g. 1.8m or null",
    "pruning": "Pruning and training detail",
    "watering": "Method and frequency",
    "fertilizing": "Full season schedule",
    "pollination": "Hand pollination if needed",
    "rowCover": "When to use fleece or polytunnel",
    "blackPlasticMulch": true,
    "pests": ["slug","aphid"],
    "diseases": ["powdery mildew"],
    "normandyTips": "Tips specific to cool oceanic Normandy"
  },
  "harvest": {
    "signs": "Visual and tactile ripeness signs",
    "technique": "How to cut or pick",
    "storage": "Temperature, duration, method",
    "culinary": "Main uses"
  },
  "companions": ["marigold"],
  "avoid": ["fennel"],
  "sources": ["https://example.com"],
  "youtubeVideos": [
    {
      "title": "Descriptive title",
      "url": "https://www.youtube.com/results?search_query=encoded+query",
      "why": "Why relevant"
    }
  ]
}`;

// ─── Quick identification prompt (phase 1 — fast) ────────────────────────────

const QUICK_PROMPT = `Identify the plant and return ONLY valid JSON. No markdown, no preamble, no trailing text.
{
  "name": "Common plant name",
  "variety": "Variety name or Standard",
  "emoji": "Single most fitting emoji",
  "brand": "Seed company name or null",
  "description": "One sentence about this plant",
  "sowMonths": [3,4],
  "transplantMonths": [5],
  "harvestMonths": [7,8,9],
  "daysToMaturity": "e.g. 70 days from transplant or null"
}`;

export async function fromURLQuick(url) {
  const raw = await callClaude(QUICK_PROMPT, [{
    role: "user",
    content: `Fetch this seed product URL and extract the plant name, variety, emoji, brand, and planting months: ${url}\n\nReturn ONLY the JSON — nothing else.`,
  }], { maxTokens: 500 });
  const seed = extractJSON(raw);
  seed.brandWebsite = url;
  return seed;
}

export async function fromImageQuick(b64, rawType, filename) {
  const mime = normaliseMime(rawType, filename);
  const raw = await callClaude(QUICK_PROMPT, [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
      { type: "text", text: "Identify this seed packet. Return ONLY the JSON — nothing else." },
    ],
  }], { maxTokens: 500 });
  return extractJSON(raw);
}

// ─── Seed extraction functions (phase 2 — full detail) ────────────────────────

export async function fromImage(b64, rawType, filename) {
  const mime = normaliseMime(rawType, filename);
  const raw = await callClaude(SEED_SYSTEM_PROMPT, [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
      { type: "text", text: "Identify this seed packet. Read the brand name and variety from the packet. Search that brand's website for the specific product page URL for this exact variety — set brandWebsite to that product page URL (not the brand homepage). If the brand is not online, search trueleafmarket.com or johnnyseeds.com for this variety. Search authoritative sources for growing detail. Find YouTube growing videos. Return ONLY the JSON object — nothing else." },
    ],
  }]);
  return extractJSON(raw);
}

export async function fromText(name) {
  const raw = await callClaude(SEED_SYSTEM_PROMPT, [{
    role: "user",
    content: `Plant name: "${name}". Search trueleafmarket.com and johnnyseeds.com for the specific product page URL for this exact variety — set brandWebsite to that direct product URL. Then search for detailed growing guides and YouTube videos. Return ONLY the JSON object — nothing else.`,
  }]);
  return extractJSON(raw);
}

export async function fromURL(url) {
  const raw = await callClaude(SEED_SYSTEM_PROMPT, [{
    role: "user",
    content: `Seed product URL: ${url}\n\nFetch this URL, read the page, extract all plant and growing data. If the page is thin on detail, search authoritative sources for the specific variety. Find 2-3 YouTube growing videos. Return ONLY the JSON object — nothing else.`,
  }]);
  const seed = extractJSON(raw);
  seed.brandWebsite = url;
  return seed;
}

// ─── Multi-photo grouping ─────────────────────────────────────────────────────
// Receives all uploaded photos and groups them by plant (front + back of same
// seed packet should be in the same group). Returns array of index groups.

export async function groupPhotos(photos) {
  // photos: [{ b64, mime, filename }]
  const content = [
    ...photos.map((p, i) => ({
      type: "image",
      source: { type: "base64", media_type: normaliseMime(p.mime, p.filename), data: p.b64 },
    })),
    {
      type: "text",
      text: `You are looking at ${photos.length} seed packet photo(s). Some may show the front and back of the same packet — those belong together as one plant entry.

Examine each image carefully. Return ONLY a JSON array of groups — no markdown, no explanation:
[
  { "indices": [0, 2], "note": "front and back of same packet" },
  { "indices": [1], "note": "single photo" }
]

Rules:
- Each index (0 to ${photos.length - 1}) must appear in exactly one group
- If in doubt, treat each photo as its own plant
- "note" is optional and for debugging only`,
    },
  ];

  const raw = await callClaude(
    "You are a seed packet analyst. Group photos that show the same seed packet.",
    [{ role: "user", content }],
    { maxTokens: 800 }
  );
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) {
    // Fallback: one group per photo
    return photos.map((_, i) => ({ indices: [i] }));
  }
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return photos.map((_, i) => ({ indices: [i] }));
  }
}

// ─── Google Doc / bulk plant list parser ─────────────────────────────────────

const PARSE_DOC_SYSTEM = `You are parsing a plant or seed list document. Extract every plant entry and return ONLY a JSON array — no markdown, no explanation, nothing else.

The document may have color group section headers (e.g. "Pink", "Coral pink", "White", "Yellow", "Orange", "Black", "Multi", "Green", "Red", "Purple", "Blue", "Grey", "Lavender/Purple"). Headers may have a count suffix like "Pink-16" (means Pink) or "Coral pink-13" (means Coral pink). Plants listed under a header belong to that color group.

For each plant:
- Extract the name exactly as written (e.g. "Zinnia cupcakes pink", "Café au Lait", "Sunflower lemon queen")
- Set colorGroup to the section header above it — must be one of: Pink | Coral pink | White | Yellow | Orange | Black | Multi | Green | Red | Purple | Blue | Grey | Lavender/Purple — or null
- Extract height if present on the same or adjacent line (e.g. "90cm", "30-50", "6'", "1.2-1.5") — null if absent
- Skip lines that are clearly not plant names: pure numbers, notes like "many tubers" / "Plant more" / "Not yet planted:" / quantity counts
- If you genuinely cannot determine whether a line is a plant name, return { "error": true, "rawText": "that line" }

Return ONLY the JSON array:
[
  { "name": "Plant Name", "colorGroup": "Pink", "height": "30-50cm" },
  { "name": "Another Plant", "colorGroup": "White", "height": null },
  { "error": true, "rawText": "confusing line here" }
]`;

export async function fromGoogleDoc(docText) {
  const raw = await callClaude(PARSE_DOC_SYSTEM, [{
    role: "user",
    content: `Parse this plant list:\n\n${docText}`,
  }], { maxTokens: 4000 });
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Could not extract plant list from document");
  return JSON.parse(raw.slice(start, end + 1));
}

// ─── Conversational plant chat (no JSON schema) ────────────────────────────────

export async function chatAboutPlant(plantName, messages) {
  const system = `You are a friendly, knowledgeable gardening assistant specialising in the home garden at Condé-en-Normandy, France (Zone RHS H4 / USDA 8b, oceanic climate). The user is asking specifically about their ${plantName}. Give practical, clear advice. Keep responses concise — 2-4 sentences unless a longer answer is genuinely needed. Today is April 2026.`;

  const raw = await callClaude(system, messages);
  return raw;
}
