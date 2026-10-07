import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { SeedsProvider, useSeedsContext } from "./SeedsContext";

// Every query resolves to the garden row for "gardens" and an empty list otherwise
const { from } = vi.hoisted(() => {
  const from = vi.fn(table => {
    const result = table === "gardens"
      ? { data: { id: "g1", background_image_url: null }, error: null }
      : { data: [], error: null };
    const chain = new Proxy({}, {
      get: (_, prop) => prop === "then"
        ? (resolve, reject) => Promise.resolve(result).then(resolve, reject)
        : () => chain,
    });
    return chain;
  });
  return { from };
});
vi.mock("../lib/supabase", () => ({ supabase: { from } }));

function LoadTwice({ plantId }) {
  const { loadPlantTasks, getPlantTasks } = useSeedsContext();
  useEffect(() => { loadPlantTasks(plantId); loadPlantTasks(plantId); }, [plantId, loadPlantTasks]);
  return <div>{getPlantTasks(plantId).length} tasks</div>;
}

describe("SeedsProvider loaders", () => {
  it("fetches a plant's tasks once, however many times pages ask", async () => {
    const { rerender } = render(<SeedsProvider><LoadTwice plantId="p1" /></SeedsProvider>);
    await waitFor(() => expect(from).toHaveBeenCalledWith("plant_tasks"));
    rerender(<SeedsProvider><LoadTwice plantId="p1" /></SeedsProvider>);

    expect(from.mock.calls.filter(([table]) => table === "plant_tasks")).toHaveLength(1);
  });

  it("keeps load functions stable across renders so effects don't loop", async () => {
    const seen = new Set();
    function Capture() {
      const { loadPlantTasks, loadDiaryEntries, loadZoneTasks, loadZoneDiary } = useSeedsContext();
      seen.add(loadPlantTasks).add(loadDiaryEntries).add(loadZoneTasks).add(loadZoneDiary);
      return null;
    }
    const { rerender } = render(<SeedsProvider><Capture /></SeedsProvider>);
    rerender(<SeedsProvider><Capture /></SeedsProvider>);
    await waitFor(() => expect(from).toHaveBeenCalledWith("zones"));

    expect(seen.size).toBe(4);
  });
});
