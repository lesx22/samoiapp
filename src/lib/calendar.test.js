import { describe, it, expect } from "vitest";
import { monthRanges, seasonSummary, filterCalendar, groupCalendar, EMPTY_CAL_FILTERS, NO_ZONE } from "./calendar";

const seeds = [
  { id: "1", name: "Zinnia", category: "Annual Flower", zoneId: "potager", sowMonths: [3, 4], harvestMonths: [7, 8, 9] },
  { id: "2", name: "Tomato", category: "Vegetable", sowMonths: [2, 3], transplantMonths: [5], harvestMonths: [8, 9] },
  { id: "3", name: "Garlic", sowMonths: [10, 11] },
];
const ids = r => r.map(s => s.id);

describe("month text", () => {
  it("joins consecutive months into ranges", () => {
    expect(monthRanges([9, 3, 4])).toBe("Mar to Apr, Sep");
  });
  it("summarises a plant's season for screen readers", () => {
    expect(seasonSummary(seeds[1])).toBe("Sow Feb to Mar; Transplant May; Harvest Aug to Sep");
    expect(seasonSummary({})).toBe("No months set");
  });
});

describe("filterCalendar", () => {
  it("finds what to do in a month, or a task in a month", () => {
    expect(ids(filterCalendar(seeds, "", { ...EMPTY_CAL_FILTERS, month: "3" }))).toEqual(["1", "2"]);
    expect(ids(filterCalendar(seeds, "", { ...EMPTY_CAL_FILTERS, type: "sow", month: "10" }))).toEqual(["3"]);
    expect(ids(filterCalendar(seeds, "", { ...EMPTY_CAL_FILTERS, type: "transplant" }))).toEqual(["2"]);
  });
  it("filters by zone, including no zone", () => {
    expect(ids(filterCalendar(seeds, "", { ...EMPTY_CAL_FILTERS, zone: NO_ZONE }))).toEqual(["2", "3"]);
  });
});

describe("groupCalendar", () => {
  it("groups by category alphabetically, with Other last", () => {
    expect(groupCalendar(seeds, "category").map(g => g.label)).toEqual(["Annual Flower", "Vegetable", "Other"]);
  });
  it("groups by zone in garden order, with No zone last", () => {
    expect(groupCalendar(seeds, "zone", [{ id: "potager", name: "Potager" }]).map(g => [g.label, ids(g.seeds)]))
      .toEqual([["Potager", ["1"]], ["No zone", ["3", "2"]]]);
  });
});
