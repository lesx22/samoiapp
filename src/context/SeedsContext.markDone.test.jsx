import { describe, it, expect, vi } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { useEffect } from "react";
import { SeedsProvider, useSeedsContext } from "./SeedsContext";

// Records every upsert; every query resolves to the garden row or an empty list
const { from, upserts } = vi.hoisted(() => {
  const upserts = [];
  const from = vi.fn(table => {
    const result = table === "gardens" ? { data: { id: "g1" }, error: null } : { data: [], error: null };
    const chain = new Proxy({}, {
      get: (_, prop) => {
        if (prop === "then") return (res, rej) => Promise.resolve(result).then(res, rej);
        if (prop === "upsert") return rows => { upserts.push({ table, rows }); return chain; };
        return () => chain;
      },
    });
    return chain;
  });
  return { from, upserts };
});
vi.mock("../lib/supabase", () => ({ supabase: { from } }));

describe("markTasksDone", () => {
  it("ticks many tasks with one database write and shows them done straight away", async () => {
    const latest = { ctx: null };
    function Grab() {
      const ctx = useSeedsContext();
      useEffect(() => { latest.ctx = ctx; });
      return null;
    }
    render(<SeedsProvider><Grab /></SeedsProvider>);
    await waitFor(() => expect(from).toHaveBeenCalledWith("task_completions"));

    await act(() => latest.ctx.markTasksDone([{ seedId: "a", taskType: "sow" }, { seedId: "b", taskType: "harvest" }]));

    expect(upserts).toEqual([{ table: "task_completions", rows: [
      { plant_id: "a", task_type: "sow" },
      { plant_id: "b", task_type: "harvest" },
    ] }]);
    expect(latest.ctx.isTaskDone("a", "sow")).toBe(true);
    expect(latest.ctx.isTaskDone("b", "harvest")).toBe(true);
  });
});
