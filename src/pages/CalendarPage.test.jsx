import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CalendarPage from "./CalendarPage";

const { context } = vi.hoisted(() => ({
  context: {
    zones: [{ id: "potager", name: "Potager" }],
    seeds: [
      { id: "1", name: "Zinnia", category: "Annual Flower", zoneId: "potager", sowMonths: [3, 4], harvestMonths: [7, 8, 9] },
      { id: "2", name: "Tomato", category: "Vegetable", sowMonths: [2, 3], transplantMonths: [5], harvestMonths: [8, 9] },
      { id: "3", name: "Garlic", category: "Vegetable", sowMonths: [10, 11] },
    ],
  },
}));
vi.mock("../context/SeedsContext", () => ({ useSeedsContext: () => context }));

const renderPage = () => render(<MemoryRouter><CalendarPage /></MemoryRouter>);

describe("Calendar", () => {
  it("groups plants by category and reads each season as text", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Annual Flower 1/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Vegetable 2/ })).toBeInTheDocument();
    expect(screen.getByText("Sow Feb to Mar; Transplant May; Growing Jun to Jul; Harvest Aug to Sep")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zinnia/ })).toHaveAttribute("href", "/seeds/1");
  });

  it("filters to what can be sown in a month", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    const sheet = screen.getByRole("dialog", { name: "Filter calendar" });
    await user.click(within(sheet).getByRole("button", { name: "Sow" }));
    await user.click(within(sheet).getByRole("button", { name: "Oct" }));
    await user.click(within(sheet).getByRole("button", { name: "Show 1 plant" }));

    expect(screen.getByRole("link", { name: /Garlic/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Tomato/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove October" })).toBeInTheDocument();
  });

  it("can group by zone instead", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByRole("combobox", { name: "Group plants by" }), "zone");
    expect(screen.getByRole("button", { name: /Potager 1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /No zone 2/ })).toBeInTheDocument();
  });
});
