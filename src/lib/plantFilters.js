import { badge, MONTHS } from "../data/garden";

export const EMPTY_FILTERS = { status: "", zone: "", category: "", plantType: "", color: "" };

// The filters that are switched on, as [key, value] pairs
export const activeFilters = f => Object.entries(f).filter(([, v]) => v);

// "SOW IN NOV" → "Sow in Nov": sentence case, but months keep their capital
export function statusLabel(t) {
  const s = t.charAt(0) + t.slice(1).toLowerCase();
  return s.replace(/\b([a-z]{3})\b/g, m => MONTHS.find(x => x.toLowerCase() === m) || m);
}

export function filterPlants(seeds, search, f) {
  const q = search.trim().toLowerCase();
  return seeds.filter(s =>
    (!q || [s.name, s.variety, s.brand].some(v => v?.toLowerCase().includes(q))) &&
    (!f.status || badge(s).t === f.status) &&
    (!f.zone || s.zoneId === f.zone) &&
    (!f.category || s.category === f.category) &&
    (!f.plantType || s.plantType === f.plantType) &&
    (!f.color || s.color === f.color),
  );
}

const STATUS_ORDER = { "SOW NOW": 0, "TRANSPLANT NOW": 1, "HARVEST NOW": 2, "SEASON DONE": 99 };
// Season order: what to do now first, then upcoming sowings, then finished
export const statusRank = t => STATUS_ORDER[t] ?? 50;
const byName = (a, b) => (a.name || "").localeCompare(b.name || "");

// zoneOrder: zone ids in the garden's order, so "By zone" follows the garden
export function sortPlants(list, sort, zoneOrder = []) {
  const r = [...list];
  if (sort === "az") return r.sort(byName);
  if (sort === "status") {
    return r.sort((a, b) => (statusRank(badge(a).t) - statusRank(badge(b).t)) || byName(a, b));
  }
  if (sort === "zone") {
    const rank = s => { const i = zoneOrder.indexOf(s.zoneId); return i === -1 ? Infinity : i; };
    return r.sort((a, b) => (rank(a) - rank(b)) || byName(a, b));
  }
  return r.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}
