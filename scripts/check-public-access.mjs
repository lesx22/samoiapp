// Checks what a logged-out visitor can read using only the public anon key.
// Every table should return zero rows and the photo bucket should list nothing.
// Usage: node scripts/check-public-access.mjs   (reads .env.local)
// Exits 1 if anything is readable.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter(line => line.includes("="))
    .map(line => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}` };

const TABLES = [
  "catalog_entries", "diary_entries", "garden_images", "gardens", "plant_tasks",
  "plants", "task_completions", "zone_diary_entries", "zone_tasks", "zones",
];

let exposed = 0;

for (const table of TABLES) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
  const body = await res.json();
  const rows = Array.isArray(body) ? body.length : 0;
  if (rows > 0) exposed++;
  console.log(`${rows > 0 ? "EXPOSED" : "locked "}  ${table}`);
}

const list = await fetch(`${url}/storage/v1/object/list/garden-images`, {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ prefix: "", limit: 1 }),
});
const files = list.ok ? await list.json() : [];
const listed = Array.isArray(files) ? files.length : 0;
if (listed > 0) exposed++;
console.log(`${listed > 0 ? "EXPOSED" : "locked "}  storage: garden-images listing`);

console.log(exposed ? `\n${exposed} exposed` : "\nAll locked");
process.exit(exposed ? 1 : 0);
