import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SeedDetailPage from "./SeedDetailPage";

const { context } = vi.hoisted(() => ({
  context: {
    seeds: [],
    getSeed: () => undefined,
    loadDiaryEntries: () => {},
    loadPlantTasks: () => {},
  },
}));
vi.mock("../context/SeedsContext", () => ({ useSeedsContext: () => context }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/seeds/:id" element={<SeedDetailPage />} /></Routes>
    </MemoryRouter>
  );
}

describe("SeedDetailPage wording", () => {
  it("calls them plants, matching the Plants tab", () => {
    renderAt("/seeds/missing");
    expect(screen.getByText("Plant not found.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Plants" })).toBeInTheDocument();
    expect(screen.queryByText(/seeds/i)).not.toBeInTheDocument();
  });
});
