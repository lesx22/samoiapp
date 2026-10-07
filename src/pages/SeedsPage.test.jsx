import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import SeedsPage from "./SeedsPage";

// One stable array, like the real context, so memoised filtering is actually exercised
const { context } = vi.hoisted(() => ({
  context: {
    seeds: [
      { id: "1", name: "Zinnia Queen Lime", plantType: "Zinnia", category: "Annual Flower", zoneId: "potager-1", createdAt: "2026-04-02" },
      { id: "2", name: "Sun Gold", plantType: "Tomato", category: "Vegetable", createdAt: "2026-04-01" },
      ...Array.from({ length: 45 }, (_, i) => ({ id: `x${i}`, name: `Bulb ${i}`, plantType: "Tulip", category: "Bulb", createdAt: "2026-01-01" })),
    ],
    zones: [{ id: "potager-1", name: "Potager" }],
  },
}));
vi.mock("../context/SeedsContext", () => ({ useSeedsContext: () => context }));

function renderPage() {
  return render(<MemoryRouter><SeedsPage onUpload={() => {}} /></MemoryRouter>);
}

describe("Plants page filters", () => {
  it("applies filters from the sheet only when you press Show", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    const sheet = screen.getByRole("dialog", { name: "Filter plants" });

    await user.selectOptions(within(sheet).getByLabelText("Plant type"), "Tomato");
    expect(screen.getByText("Zinnia Queen Lime")).toBeInTheDocument(); // still a draft

    await user.click(within(sheet).getByRole("button", { name: "Show 1 plant" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Zinnia Queen Lime")).not.toBeInTheDocument();
    expect(screen.getByText("Sun Gold")).toBeInTheDocument();
    expect(screen.getByText("1 of 47 plants")).toBeInTheDocument();
  });

  it("shows zone names, not ids, and the chip removes the filter", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    const sheet = screen.getByRole("dialog");
    await user.click(within(sheet).getByRole("button", { name: "Potager" }));
    await user.click(within(sheet).getByRole("button", { name: "Show 1 plant" }));

    expect(screen.queryByText("potager-1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Potager" }));
    expect(screen.getByText("47 plants")).toBeInTheDocument();
  });

  it("closes the sheet with Escape without applying the draft", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Vegetable" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("47 plants")).toBeInTheDocument();
  });

  it("shows plants in pages of 40", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getAllByRole("link")).toHaveLength(40);
    await user.click(screen.getByRole("button", { name: "Show 7 more" }));
    expect(screen.getAllByRole("link")).toHaveLength(47);
  });
});
