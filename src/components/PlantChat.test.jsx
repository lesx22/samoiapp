import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlantChat from "./PlantChat";

const { chatAboutPlant } = vi.hoisted(() => ({ chatAboutPlant: vi.fn() }));
vi.mock("../lib/claude", () => ({ chatAboutPlant }));

const seed = { id: "p1", name: "Celosia", variety: "Flamingo Feather" };

describe("PlantChat", () => {
  beforeEach(() => {
    localStorage.clear();
    chatAboutPlant.mockReset();
  });

  it("renders answers as formatted text with source links, not raw symbols", async () => {
    chatAboutPlant.mockResolvedValue({
      text: "Cut when **two-thirds open**.\n\n- Morning is best\n- Hang upside down",
      sources: [{ url: "https://www.rhs.org.uk/celosia", title: "RHS" }, { url: "https://www.rhs.org.uk/drying", title: "RHS drying" }],
    });
    render(<PlantChat seed={seed} />);
    await userEvent.type(screen.getByLabelText("Ask about your Celosia"), "When to cut?{Enter}");

    const bold = await screen.findByText("two-thirds open");
    expect(bold.tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    const source = screen.getByRole("link", { name: "rhs.org.uk" }); // two RHS pages, one link
    expect(source).toHaveAttribute("href", "https://www.rhs.org.uk/celosia");
    expect(source).toHaveAttribute("target", "_blank");
  });

  it("shows thinking, then searching, then the answer as it streams in", async () => {
    let handlers, finish;
    chatAboutPlant.mockImplementation((name, msgs, h) => { handlers = h; return new Promise(r => { finish = r; }); });
    render(<PlantChat seed={seed} />);
    await userEvent.type(screen.getByLabelText("Ask about your Celosia"), "Hi{Enter}");
    expect(within(screen.getByRole("status")).getByText("Thinking…")).toBeInTheDocument();

    act(() => handlers.onSearch());
    expect(within(screen.getByRole("status")).getByText("Searching the web…")).toBeInTheDocument();

    act(() => handlers.onText("Water **weekly**"));
    expect(screen.getByText("weekly").tagName).toBe("STRONG");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await act(async () => finish({ text: "Water **weekly** at the base.", sources: [] }));
    expect(screen.getByText(/at the base/)).toBeInTheDocument();
    expect(screen.getAllByText("weekly")).toHaveLength(1);
  });

  it("says plainly when an answer fails, without technical detail", async () => {
    chatAboutPlant.mockRejectedValue(new Error('API 500: {"type":"error"}'));
    render(<PlantChat seed={seed} />);
    await userEvent.type(screen.getByLabelText("Ask about your Celosia"), "Hi{Enter}");
    expect(await screen.findByText(/couldn't get an answer/)).toBeInTheDocument();
    expect(screen.queryByText(/API 500/)).not.toBeInTheDocument();
  });

  it("keeps the conversation for this plant", async () => {
    chatAboutPlant.mockResolvedValue({ text: "Weekly", sources: [] });
    const { unmount } = render(<PlantChat seed={seed} />);
    await userEvent.type(screen.getByLabelText("Ask about your Celosia"), "How often?{Enter}");
    await screen.findByText("Weekly");
    unmount();
    render(<PlantChat seed={seed} />);
    expect(screen.getByText("How often?")).toBeInTheDocument();
    expect(screen.getByText("Weekly")).toBeInTheDocument();
  });
});

describe("tidyBullets", () => {
  it("turns inline • bullets into a Markdown list", async () => {
    const { tidyBullets } = await import("../lib/markdown");
    expect(tidyBullets("How: • **Timing**: late summer • **Stage**: full bloom\nThe key is colour."))
      .toBe("How:\n\n- **Timing**: late summer\n- **Stage**: full bloom\n\nThe key is colour.");
  });
  it("leaves normal Markdown alone", async () => {
    const { tidyBullets } = await import("../lib/markdown");
    expect(tidyBullets("- a\n- b")).toBe("- a\n- b");
  });
});
