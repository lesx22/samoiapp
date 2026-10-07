import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SeedDetailPage from "./SeedDetailPage";

const { context, failed } = vi.hoisted(() => {
  const failed = { id: "p1", name: "Plant from johnnyseeds.com", fetchError: "API 500" };
  return {
    failed,
    context: {
      getSeed: () => failed,
      removeSeed: vi.fn(),
      loadDiaryEntries: () => {},
      loadPlantTasks: () => {},
    },
  };
});
vi.mock("../context/SeedsContext", () => ({ useSeedsContext: () => context }));

function renderFailed() {
  return render(
    <MemoryRouter initialEntries={["/seeds/p1"]}>
      <Routes><Route path="/seeds/:id" element={<SeedDetailPage />} /></Routes>
    </MemoryRouter>
  );
}

describe("a plant that failed to add", () => {
  beforeEach(() => context.removeSeed.mockClear());

  it("shows why it failed and can be removed after confirming", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderFailed();
    expect(screen.getByText(/The AI service had a problem/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(window.confirm).toHaveBeenCalledWith(`Remove ${failed.name}? This can't be undone.`);
    expect(context.removeSeed).toHaveBeenCalledWith("p1");
  });

  it("keeps the plant if the confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderFailed();
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(context.removeSeed).not.toHaveBeenCalled();
  });
});
