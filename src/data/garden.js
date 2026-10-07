export const LOC = {
  name: "Condé-en-Normandy, France",
  zone: "RHS H4 / USDA 8b",
  climate: "Oceanic Cfb",
  lastFrost: "~mid-April",
  firstFrost: "~early November",
  season: "≈200 days",
  plot: "1/8 acre · ~500 m²",
};

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

// Returns all actionable tasks for a seed: current-month tasks + overdue tasks
// taskType: "sow" | "transplant" | "harvest"
// status: "current" | "overdue"
export function getActiveTasks(seed) {
  const m = TODAY_M;
  const tasks = [];

  // Sow
  if (seed.sowMonths?.includes(m)) {
    tasks.push({ type: "sow", label: "Sow now", status: "current", color: "var(--color-green)" });
  } else if (seed.sowMonths?.length && Math.max(...seed.sowMonths) < m) {
    tasks.push({ type: "sow", label: "Overdue: Sow", status: "overdue", color: "var(--color-error)" });
  }

  // Transplant
  if (seed.transplantMonths?.includes(m)) {
    tasks.push({ type: "transplant", label: "Transplant now", status: "current", color: "#1d4ed8" });
  } else if (seed.transplantMonths?.length && Math.max(...seed.transplantMonths) < m) {
    tasks.push({ type: "transplant", label: "Overdue: Transplant", status: "overdue", color: "var(--color-error)" });
  }

  // Harvest
  if (seed.harvestMonths?.includes(m)) {
    tasks.push({ type: "harvest", label: "Harvest now", status: "current", color: "#b45309" });
  } else if (seed.harvestMonths?.length && Math.max(...seed.harvestMonths) < m) {
    tasks.push({ type: "harvest", label: "Overdue: Harvest", status: "overdue", color: "var(--color-error)" });
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
