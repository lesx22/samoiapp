import { describe, it, expect } from "vitest";
import { filterPlants, sortPlants, statusLabel, activeFilters, EMPTY_FILTERS } from "./plantFilters";

const seeds = [
  { id: "1", name: "Zinnia", variety: "Queen Lime", plantType: "Zinnia", color: "Green", zoneId: "potager", createdAt: "2026-04-02" },
  { id: "2", name: "Sun Gold", plantType: "Tomato", brand: "Vilmorin", zoneId: "orchard", createdAt: "2026-04-03" },
  { id: "3", name: "Basil", plantType: "Herb", createdAt: "2026-04-01" },
];

describe("filterPlants", () => {
  it("searches name, variety and brand", () => {
    expect(filterPlants(seeds, "lime", EMPTY_FILTERS).map(s => s.id)).toEqual(["1"]);
    expect(filterPlants(seeds, "vilmorin", EMPTY_FILTERS).map(s => s.id)).toEqual(["2"]);
  });
  it("combines filters", () => {
    expect(filterPlants(seeds, "", { ...EMPTY_FILTERS, zone: "potager", color: "Green" }).map(s => s.id)).toEqual(["1"]);
    expect(filterPlants(seeds, "", { ...EMPTY_FILTERS, zone: "potager", plantType: "Tomato" })).toEqual([]);
  });
});

describe("sortPlants", () => {
  it("sorts newest first by default", () => {
    expect(sortPlants(seeds, "newest").map(s => s.id)).toEqual(["2", "1", "3"]);
  });
  it("sorts by the garden's zone order, plants without a zone last", () => {
    expect(sortPlants(seeds, "zone", ["orchard", "potager"]).map(s => s.id)).toEqual(["2", "1", "3"]);
  });
});

describe("statusLabel and activeFilters", () => {
  it("uses sentence case but keeps month capitals", () => {
    expect(statusLabel("HARVEST NOW")).toBe("Harvest now");
    expect(statusLabel("SOW IN NOV")).toBe("Sow in Nov");
  });
  it("lists only the filters that are on", () => {
    expect(activeFilters({ ...EMPTY_FILTERS, zone: "potager" })).toEqual([["zone", "potager"]]);
  });
});
