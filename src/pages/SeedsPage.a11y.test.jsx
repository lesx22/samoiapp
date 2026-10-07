import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SeedsPage from "./SeedsPage";

const { context } = vi.hoisted(() => ({
  context: {
    seeds: [{ id: "1", name: "Sun Gold", plantType: "Tomato", category: "Vegetable", createdAt: "2026-04-01" }],
    zones: [],
    getZone: () => null,
  },
}));
vi.mock("../context/SeedsContext", () => ({ useSeedsContext: () => context }));

describe("SeedsPage accessibility", () => {
  it("gives every dropdown a name a screen reader can announce", () => {
    window.innerWidth = 1440;
    render(<MemoryRouter><SeedsPage onUpload={() => {}} /></MemoryRouter>);
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
    for (const select of selects) expect(select).toHaveAccessibleName();
    expect(screen.getByRole("combobox", { name: "Sort plants" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by plant type" })).toBeInTheDocument();
  });
});
