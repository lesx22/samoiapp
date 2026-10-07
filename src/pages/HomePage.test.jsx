import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import HomePage from "./HomePage";
import Nav from "../components/Nav";

const { context } = vi.hoisted(() => ({
  context: { seeds: [], toggleTask: () => {}, isTaskDone: () => false },
}));
vi.mock("../context/SeedsContext", () => ({ useSeedsContext: () => context }));
vi.mock("../lib/supabase", () => ({ supabase: { auth: { signOut: () => {} } } }));

function renderHome() {
  return render(<MemoryRouter><HomePage onUpload={() => {}} /></MemoryRouter>);
}

describe("Home (with the former Zone page folded in)", () => {
  it("shows the key garden facts, and the rest behind More", async () => {
    renderHome();
    expect(screen.getByText("Growing zone")).toBeInTheDocument();
    expect(screen.getByText("Last frost")).toBeInTheDocument();
    expect(screen.queryByText("Plot size")).not.toBeInTheDocument();

    const more = screen.getByRole("button", { name: "More about your garden" });
    expect(more).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(more);

    expect(screen.getByText("Plot size")).toBeInTheDocument();
    expect(screen.getByText("Climate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps Normandy growing notes collapsed until opened", async () => {
    renderHome();
    expect(screen.queryByText(/Oceanic climate/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Normandy growing notes" }));
    expect(screen.getByText(/Oceanic climate/)).toBeInTheDocument();
  });
});

describe("Home's Today card", () => {
  afterEach(() => { context.seeds = []; vi.useRealTimers(); });

  it("shows tasks due now first and leaves out ones that are probably done", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 7, 9, 0));
    // Sowing ended in April (probably done); harvest is due now
    context.seeds = [{ id: "c", name: "Celosia", sowMonths: [4], harvestMonths: [10] }];
    renderHome();
    expect(screen.getByRole("checkbox", { name: "Harvest Celosia" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Sow Celosia" })).not.toBeInTheDocument();
    expect(screen.queryByText(/days late/)).not.toBeInTheDocument();
  });
});

describe("Nav", () => {
  it("has no separate Zone tab any more", () => {
    render(<MemoryRouter><Nav session={null} /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: /^Zone$/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Garden/ }).length).toBeGreaterThan(0);
  });
});
