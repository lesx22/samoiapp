export const LOC = {
  name: "Condé-en-Normandy, France",
  zone: "RHS H4 / USDA 8b",
  climate: "Oceanic Cfb",
  lastFrost: "~mid-April",
  firstFrost: "~early November",
  season: "≈200 days",
  plot: "1/8 acre · ~500 m²",
};

// Shown on Home: the first three always, the rest behind "More"
export const GARDEN_FACTS = [
  { key: "zone",       label: "Growing zone" },
  { key: "lastFrost",  label: "Last frost" },
  { key: "firstFrost", label: "First frost" },
  { key: "name",       label: "Location" },
  { key: "climate",    label: "Climate" },
  { key: "season",     label: "Frost-free season" },
  { key: "plot",       label: "Plot size" },
];
export const KEY_FACT_COUNT = 3;

export const NORMANDY_NOTES = [
  "Oceanic climate — mild and wet. Brassicas, roots, and salads thrive year-round.",
  "Warm-season crops (melons, squash, peppers) need black plastic mulch and row cover.",
  "Choose early-maturing varieties for heat-lovers — summers are cooler than southern France.",
  "Main threats: slugs, blight, downy mildew. Mulch well, water at soil level only.",
  "Start tender crops under glass or LED grow lights from early March for best results.",
  "Around 200 frost-free days — a very long season for cool-weather crops.",
];

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const TODAY_M = new Date().getMonth() + 1;

export function badge(seed) {
  const m = TODAY_M;
  if (seed.sowMonths?.includes(m))        return { t: "SOW NOW",        color: "var(--color-green)", type: "sow" };
  if (seed.transplantMonths?.includes(m)) return { t: "TRANSPLANT NOW", color: "#1d4ed8", type: "transplant" };
  if (seed.harvestMonths?.includes(m))    return { t: "HARVEST NOW",    color: "#b45309", type: "harvest" };
  const nxt = [...(seed.sowMonths || []), ...(seed.transplantMonths || [])].filter(x => x > m).sort()[0];
  if (nxt) return { t: `SOW IN ${MONTHS[nxt - 1].toUpperCase()}`, color: "#c2410c" };
  return { t: "SEASON DONE", color: "var(--color-text-muted)" };
}

// Days since a month window ended (0 while it's still open). Months are 1-12.
export function daysOverdue(months, today = new Date()) {
  const lastDay = new Date(today.getFullYear(), Math.max(...months), 0); // day 0 = last day of that month
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const ms = startOfToday.getTime() - lastDay.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

// An overdue task older than this was probably done but not ticked off
export const PROBABLY_DONE_AFTER_DAYS = 14;

// Returns all actionable tasks for a seed: current-month tasks + overdue tasks
// taskType: "sow" | "transplant" | "harvest"
// status: "current" | "overdue"; overdue tasks also carry daysOverdue
export function getActiveTasks(seed, today = new Date()) {
  const m = today.getMonth() + 1;
  const tasks = [];

  // Sow
  if (seed.sowMonths?.includes(m)) {
    tasks.push({ type: "sow", label: "Sow now", status: "current", color: "var(--color-green)" });
  } else if (seed.sowMonths?.length && Math.max(...seed.sowMonths) < m) {
    tasks.push({ type: "sow", label: "Overdue: Sow", status: "overdue", color: "var(--color-error)", daysOverdue: daysOverdue(seed.sowMonths, today) });
  }

  // Transplant
  if (seed.transplantMonths?.includes(m)) {
    tasks.push({ type: "transplant", label: "Transplant now", status: "current", color: "#1d4ed8" });
  } else if (seed.transplantMonths?.length && Math.max(...seed.transplantMonths) < m) {
    tasks.push({ type: "transplant", label: "Overdue: Transplant", status: "overdue", color: "var(--color-error)", daysOverdue: daysOverdue(seed.transplantMonths, today) });
  }

  // Harvest
  if (seed.harvestMonths?.includes(m)) {
    tasks.push({ type: "harvest", label: "Harvest now", status: "current", color: "#b45309" });
  } else if (seed.harvestMonths?.length && Math.max(...seed.harvestMonths) < m) {
    tasks.push({ type: "harvest", label: "Overdue: Harvest", status: "overdue", color: "var(--color-error)", daysOverdue: daysOverdue(seed.harvestMonths, today) });
  }

  return tasks;
}

// Short how-to for a task, built from the plant's fixed facts (not the dated
// AI advice, which was written for the day the plant was added).
export function taskGuidance(seed, type) {
  const join = parts => parts.filter(Boolean).join(" ") || null;
  if (type === "sow") {
    return join([
      seed.startMethod && `${seed.startMethod}.`,
      seed.germinationDays && `Germinates in ${seed.germinationDays}${seed.germinationTempC ? ` at ${seed.germinationTempC}` : ""}.`,
    ]);
  }
  if (type === "transplant") {
    const t = seed.transplanting || {};
    return join([
      t.spacing && `Space ${t.spacing}${t.rowSpacing ? `, rows ${t.rowSpacing}` : ""}.`,
      t.soilTempMinC != null && `Wait until the soil is at least ${t.soilTempMinC}°C.`,
    ]);
  }
  if (type === "harvest") return seed.harvest?.signs || null;
  return null;
}

// Groups { seed, task } items by the plant's zone, in the garden's zone order.
// Plants without a zone go last, under "No zone".
export function groupByZone(items, zones) {
  const groups = new Map(zones.map(z => [z.id, { zone: z, items: [] }]));
  const noZone = { zone: null, items: [] };
  for (const item of items) (groups.get(item.seed.zoneId) || noZone).items.push(item);
  return [...groups.values(), noZone].filter(g => g.items.length > 0);
}
