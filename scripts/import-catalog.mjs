import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env file
const envText = readFileSync(join(__dirname, "../.env"), "utf-8");
const env = Object.fromEntries(
  envText.split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const [k, ...v] = l.split("="); return [k.trim(), v.join("=").trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const johnny  = JSON.parse(readFileSync(join(__dirname, "../public/seed-catalog.json"), "utf-8"));
const willemse = JSON.parse(readFileSync(join(__dirname, "../public/willemse-catalog.json"), "utf-8"));

const all = [...johnny, ...willemse].map(e => ({
  name:     e.name,
  category: e.category || null,
  provider: e.provider || null,
  url:      e.url      || null,
  verified: true,
}));

console.log(`Importing ${all.length} entries in batches of 500…`);

const BATCH = 500;
for (let i = 0; i < all.length; i += BATCH) {
  const chunk = all.slice(i, i + BATCH);
  const { error } = await supabase.from("catalog_entries").insert(chunk);
  if (error) {
    console.error(`Error at batch ${Math.floor(i / BATCH) + 1}:`, error.message);
    process.exit(1);
  }
  console.log(`  ${Math.min(i + BATCH, all.length)} / ${all.length}`);
}

console.log("Done!");
