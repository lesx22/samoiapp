import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./LoginPage";

const { resetPasswordForEmail, signInWithOtp } = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn(), signInWithOtp: vi.fn() }));
vi.mock("../lib/supabase", () => ({
  supabase: { auth: { resetPasswordForEmail, signInWithOtp } },
}));

async function openResetForm(user) {
  render(<LoginPage />);
  await user.click(screen.getByRole("button", { name: "Log in" }));
  await user.click(screen.getByRole("button", { name: "Forgot password?" }));
}

describe("LoginPage forgot password", () => {
  beforeEach(() => resetPasswordForEmail.mockReset());

  it("sends a reset email to the trimmed, lowercased address and confirms it", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    await openResetForm(user);

    expect(screen.getByRole("heading", { name: "Reset password" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("••••••••")).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("you@example.com"), "  Laura@Example.com ");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(resetPasswordForEmail).toHaveBeenCalledWith("laura@example.com", { redirectTo: window.location.origin });
    expect(screen.getByText(/We sent a password reset link to/)).toBeInTheDocument();
  });

  it("shows the Supabase error and stays on the form when sending fails", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { message: "Rate limit exceeded" } });
    const user = userEvent.setup();
    await openResetForm(user);

    await user.type(screen.getByPlaceholderText("you@example.com"), "laura@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send reset link" })).toBeInTheDocument();
  });

  it("returns to the password sign-in form", async () => {
    const user = userEvent.setup();
    await openResetForm(user);

    await user.click(screen.getByRole("button", { name: "Back to sign in" }));

    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });
});

describe("LoginPage magic link", () => {
  it("never creates a new account for an unknown email", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await user.click(screen.getByRole("button", { name: "Magic link" }));
    await user.type(screen.getByPlaceholderText("you@example.com"), "stranger@example.com");
    await user.click(screen.getByRole("button", { name: "Send magic link" }));

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "stranger@example.com",
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    });
  });
});
