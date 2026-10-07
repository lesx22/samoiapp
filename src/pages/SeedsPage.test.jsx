import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SeedsPage from "./SeedsPage";

// One stable array, like the real context, so memoised filtering is actually exercised
const { context } = vi.hoisted(() => ({
  context: {
    seeds: [
      { id: "1", name: "Zinnia Queen Lime", plantType: "Zinnia", category: "Annual Flower", createdAt: "2026-04-02" },
      { id: "2", name: "Sun Gold", plantType: "Tomato", category: "Vegetable", createdAt: "2026-04-01" },
    ],
    zones: [],
    getZone: () => null,
  },
}));
vi.mock("../context/SeedsContext", () => ({ useSeedsContext: () => context }));

describe("SeedsPage filters", () => {
  it("narrows the list when a plant type is picked", async () => {
    window.innerWidth = 1440;
    const user = userEvent.setup();
    render(<MemoryRouter><SeedsPage onUpload={() => {}} /></MemoryRouter>);

    expect(screen.getAllByText("Zinnia Queen Lime").length).toBeGreaterThan(0);

    const plantType = screen.getAllByRole("combobox").find(el => el.querySelector('option[value=""]')?.textContent === "Plant type");
    await user.selectOptions(plantType, "Tomato");

    expect(screen.queryByText("Zinnia Queen Lime")).not.toBeInTheDocument();
    expect(screen.getAllByText("Sun Gold").length).toBeGreaterThan(0);
  });
});
