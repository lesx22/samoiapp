export const EMPTY_TASK_FILTERS = { zone: "", type: "" };

// Plants without a zone are picked with this value in the Zone filter
export const NO_ZONE = "none";

export const TASK_TYPES = [
  { value: "sow", label: "Sow" },
  { value: "transplant", label: "Transplant" },
  { value: "harvest", label: "Harvest" },
];

// items: { seed, task } pairs
export function filterTasks(items, search, f) {
  const q = search.trim().toLowerCase();
  return items.filter(({ seed, task }) =>
    (!q || [seed.name, seed.variety].some(v => v?.toLowerCase().includes(q))) &&
    (!f.type || task.type === f.type) &&
    (!f.zone || (f.zone === NO_ZONE ? !seed.zoneId : seed.zoneId === f.zone)),
  );
}
