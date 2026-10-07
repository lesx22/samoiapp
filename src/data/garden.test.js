import { describe, it, expect } from "vitest";
import { taskGuidance } from "./garden";

const celosia = {
  startMethod: "Soil blocks",
  germinationDays: "7-10 days",
  germinationTempC: "21-27°C",
  transplanting: { spacing: "30cm", rowSpacing: "45cm", soilTempMinC: 15 },
  harvest: { signs: "Cut when spikes are two-thirds open" },
  // Dated AI text written on the day the plant was added: must never be used for tasks
  immediateNextStep: "Press seeds onto soil blocks today",
};

describe("taskGuidance", () => {
  it("gives harvest tasks harvest guidance, not the sowing text", () => {
    expect(taskGuidance(celosia, "harvest")).toBe("Cut when spikes are two-thirds open");
  });

  it("builds sowing guidance from germination facts", () => {
    expect(taskGuidance(celosia, "sow")).toBe("Soil blocks. Germinates in 7-10 days at 21-27°C.");
  });

  it("builds transplant guidance from spacing and soil temperature", () => {
    expect(taskGuidance(celosia, "transplant")).toBe("Space 30cm, rows 45cm. Wait until the soil is at least 15°C.");
  });

  it("returns null when the plant has no facts for that task", () => {
    expect(taskGuidance({}, "harvest")).toBeNull();
    expect(taskGuidance({}, "sow")).toBeNull();
    expect(taskGuidance(celosia, undefined)).toBeNull();
  });
});
