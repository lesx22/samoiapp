import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import App from "./App";

const { auth } = vi.hoisted(() => {
  const listeners = [];
  return {
    auth: {
      listeners,
      getSession: vi.fn(async () => ({ data: { session: { user: { email: "laura@example.com" } } } })),
      onAuthStateChange: vi.fn(cb => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe: () => {} } } };
      }),
    },
  };
});
vi.mock("./lib/supabase", () => ({ supabase: { auth } }));

afterEach(() => {
  window.location.hash = "";
  auth.listeners.length = 0;
});

describe("App password recovery", () => {
  it("shows the set-new-password page when opened from a recovery link", async () => {
    window.location.hash = "#access_token=abc&type=recovery";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Set new password" })).toBeInTheDocument();
  });

  it("stays on the set-new-password page when Supabase signs the user in", async () => {
    window.location.hash = "#access_token=abc&type=recovery";
    render(<App />);
    await screen.findByRole("heading", { name: "Set new password" });

    act(() => auth.listeners.forEach(cb => cb("SIGNED_IN", { user: { email: "laura@example.com" } })));

    expect(screen.getByRole("heading", { name: "Set new password" })).toBeInTheDocument();
  });
});
