import { MONTHS } from "../data/garden";

export const EMPTY_CAL_FILTERS = { zone: "", category: "", type: "", month: "" };
export const NO_ZONE = "none";

const MONTH_KEYS = { sow: "sowMonths", transplant: "transplantMonths", harvest: "harvestMonths" };
const TYPES = Object.keys(MONTH_KEYS);

export const monthsFor = (seed, type) => seed[MONTH_KEYS[type]] || [];

// [3, 4, 9] → "Mar to Apr, Sep"
export function monthRanges(months) {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  const runs = [];
  for (const m of sorted) {
    const last = runs[runs.length - 1];
    if (last && m === last[1] + 1) last[1] = m;
    else runs.push([m, m]);
  }
  return runs.map(([a, b]) => a === b ? MONTHS[a - 1] : `${MONTHS[a - 1]} to ${MONTHS[b - 1]}`).join(", ");
}

// A sentence a screen reader can read in place of the coloured bars
export function seasonSummary(seed) {
  const parts = TYPES.filter(t => monthsFor(seed, t).length)
    .map(t => `${t[0].toUpperCase()}${t.slice(1)} ${monthRanges(monthsFor(seed, t))}`);
  return parts.length ? parts.join("; ") : "No months set";
}

export function filterCalendar(seeds, search, f) {
  const q = search.trim().toLowerCase();
  const month = f.month ? Number(f.month) : null;
  const types = f.type ? [f.type] : TYPES;
  return seeds.filter(s =>
    (!q || [s.name, s.variety].some(v => v?.toLowerCase().includes(q))) &&
    (!f.zone || (f.zone === NO_ZONE ? !s.zoneId : s.zoneId === f.zone)) &&
    (!f.category || s.category === f.category) &&
    // Task and month together: "sow in March". Either alone: any of that task, or anything that month.
    (!f.type && !month || types.some(t => month ? monthsFor(s, t).includes(month) : monthsFor(s, t).length > 0)),
  );
}

const byName = (a, b) => (a.name || "").localeCompare(b.name || "");

// by: "category" | "zone" | "none". Returns [{ key, label, seeds }]
export function groupCalendar(seeds, by, zones = []) {
  const sorted = [...seeds].sort(byName);
  if (by === "none") return [{ key: "all", label: null, seeds: sorted }];
  if (by === "zone") {
    const groups = [...zones.map(z => ({ key: z.id, label: z.name, seeds: [] })), { key: NO_ZONE, label: "No zone", seeds: [] }];
    for (const s of sorted) (groups.find(g => g.key === s.zoneId) || groups[groups.length - 1]).seeds.push(s);
    return groups.filter(g => g.seeds.length);
  }
  const map = new Map();
  for (const s of sorted) {
    const label = s.category || "Other";
    if (!map.has(label)) map.set(label, { key: label, label, seeds: [] });
    map.get(label).seeds.push(s);
  }
  // Alphabetical, with "Other" last
  return [...map.values()].sort((a, b) => (a.label === "Other") - (b.label === "Other") || a.label.localeCompare(b.label));
}
