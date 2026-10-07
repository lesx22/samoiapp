import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SeedsPage from "./SeedsPage";

const { context } = vi.hoisted(() => ({
  context: {
    seeds: [{ id: "1", name: "Sun Gold", plantType: "Tomato", category: "Vegetable", createdAt: "2026-04-01" }],
    zones: [],
  },
}));
vi.mock("../context/SeedsContext", () => ({ useSeedsContext: () => context }));

describe("Plants page accessibility", () => {
  it("gives every control a name a screen reader can announce, including in the filter sheet", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SeedsPage onUpload={() => {}} /></MemoryRouter>);
    expect(screen.getByRole("combobox", { name: "Sort plants" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search plants" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    for (const el of [...screen.getAllByRole("combobox"), ...screen.getAllByRole("button")]) {
      expect(el).toHaveAccessibleName();
    }
    expect(screen.getByRole("combobox", { name: "Plant type" })).toBeInTheDocument();
  });
});
