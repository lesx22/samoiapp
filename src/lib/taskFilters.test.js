import { describe, it, expect } from "vitest";
import { filterTasks, EMPTY_TASK_FILTERS, NO_ZONE } from "./taskFilters";

const items = [
  { seed: { name: "Celosia", variety: "Flamingo Feather", zoneId: "potager" }, task: { type: "harvest" } },
  { seed: { name: "Zinnia", zoneId: "potager" }, task: { type: "sow" } },
  { seed: { name: "Sweet pea", zoneId: null }, task: { type: "sow" } },
];
const names = r => r.map(i => i.seed.name);

describe("filterTasks", () => {
  it("searches plant name and variety", () => {
    expect(names(filterTasks(items, "flamingo", EMPTY_TASK_FILTERS))).toEqual(["Celosia"]);
  });
  it("filters by task type and zone, including plants with no zone", () => {
    expect(names(filterTasks(items, "", { zone: "potager", type: "sow" }))).toEqual(["Zinnia"]);
    expect(names(filterTasks(items, "", { zone: NO_ZONE, type: "" }))).toEqual(["Sweet pea"]);
  });
});
