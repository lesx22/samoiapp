import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import TodayPage from "./TodayPage";

// 7 October 2026: celosia harvest is current, tomato harvest ended 7 days ago,
// and the April sowings ended months ago (probably done)
const { context } = vi.hoisted(() => ({
  context: {
    zones: [{ id: "potager", name: "Potager", emoji: "🥕" }],
    seeds: [
      { id: "c", name: "Celosia", zoneId: "potager", harvestMonths: [10] },
      { id: "t", name: "Tomato", zoneId: "potager", harvestMonths: [9] },
      { id: "z", name: "Zinnia", zoneId: "potager", sowMonths: [4] },
      { id: "s", name: "Sweet pea", zoneId: null, sowMonths: [3] },
    ],
    toggleTask: vi.fn(),
    isTaskDone: () => false,
    markTasksDone: vi.fn(),
  },
}));
vi.mock("../context/SeedsContext", () => ({ useSeedsContext: () => context }));

describe("Today", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 7, 9, 0));
    context.markTasksDone.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  function renderToday() {
    return render(<MemoryRouter><TodayPage /></MemoryRouter>);
  }

  it("sorts tasks into now, overdue and probably done, grouped by area", () => {
    renderToday();
    expect(screen.getByText(/Wednesday 7 October · 1 to do now · 1 overdue · 2 probably already done/)).toBeInTheDocument();

    const now = screen.getByRole("heading", { name: "To do now 1" }).closest("section");
    expect(within(now).getByRole("heading", { name: /Potager/ })).toBeInTheDocument();
    expect(within(now).getByText("Celosia")).toBeInTheDocument();

    const overdue = screen.getByRole("heading", { name: "Overdue 1" }).closest("section");
    expect(within(overdue).getByText("Tomato")).toBeInTheDocument();
    expect(within(overdue).getByText("7 days late")).toBeInTheDocument();
    expect(within(overdue).queryByText("Zinnia")).not.toBeInTheDocument();
  });

  it("filters by task type from the sheet, including plants with no zone", async () => {
    const user = userEvent.setup({ advanceTimers: () => {} });
    renderToday();
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    const sheet = screen.getByRole("dialog", { name: "Filter tasks" });
    await user.click(within(sheet).getByRole("button", { name: "No zone" }));
    await user.click(within(sheet).getByRole("button", { name: "Show 1 task" }));

    expect(screen.queryByText("Celosia")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove No zone" })).toBeInTheDocument();
    expect(screen.getByText(/0 to do now|1 probably already done/)).toBeInTheDocument();
  });

  it("ticks a task, then removes it after a short pause", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date(2026, 9, 7, 9, 0));
    context.toggleTask.mockClear();
    renderToday();
    const tick = screen.getByRole("checkbox", { name: "Harvest Celosia" });
    fireEvent.click(tick);
    expect(tick).toHaveAttribute("aria-checked", "true");
    expect(context.toggleTask).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1200));
    expect(context.toggleTask).toHaveBeenCalledWith("c", "harvest");
  });

  it("bundles old tasks by area, collapsed, and clears an area with one tap", async () => {
    const user = userEvent.setup({ advanceTimers: () => {} });
    renderToday();
    const stale = screen.getByRole("heading", { name: "Probably already done 2" }).closest("section");
    expect(within(stale).getByRole("button", { name: /Potager · 1 task/ })).toHaveAttribute("aria-expanded", "false");
    expect(within(stale).getByRole("button", { name: /No zone · 1 task/ })).toBeInTheDocument();
    expect(within(stale).queryByText("Zinnia")).not.toBeInTheDocument();

    const potagerBar = within(stale).getByRole("button", { name: /Potager/ }).parentElement;
    await user.click(within(potagerBar).getByRole("button", { name: "Mark all done" }));
    expect(context.markTasksDone).toHaveBeenCalledWith([{ seedId: "z", taskType: "sow" }]);
  });
});
