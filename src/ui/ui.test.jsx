import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, Field, Input, Chip, Segmented, nextHeaderHidden } from "./index";

describe("Button", () => {
  it("uses the variant class and is a plain button by default", () => {
    render(<Button variant="secondary">Filter</Button>);
    const b = screen.getByRole("button", { name: "Filter" });
    expect(b.className).toContain("ui-btn--secondary");
    expect(b.getAttribute("type")).toBe("button");
  });

  it("is disabled and busy while loading", () => {
    render(<Button loading>Saving</Button>);
    const b = screen.getByRole("button", { name: "Saving" });
    expect(b.disabled).toBe(true);
    expect(b.getAttribute("aria-busy")).toBe("true");
  });

  it("icon-only buttons keep their accessible name", () => {
    render(<Button iconOnly icon="close" aria-label="Close" />);
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });
});

describe("Field", () => {
  it("links the label, hint and error to the input", () => {
    render(<Field label="Variety" hint="Optional" error="Too long"><Input /></Field>);
    const input = screen.getByLabelText("Variety");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const described = input.getAttribute("aria-describedby").split(" ").map(id => document.getElementById(id).textContent);
    expect(described).toEqual(["Optional", "Too long"]);
  });
});

describe("Chip and Segmented", () => {
  it("chip's cross button removes the filter", () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Potager</Chip>);
    fireEvent.click(screen.getByRole("button", { name: "Remove Potager" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("segmented marks the chosen option as pressed", () => {
    const onChange = vi.fn();
    render(<Segmented label="View" value="list" onChange={onChange}
      options={[{ value: "list", label: "List" }, { value: "grid", label: "Grid" }]} />);
    expect(screen.getByRole("button", { name: "List" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Grid" }));
    expect(onChange).toHaveBeenCalledWith("grid");
  });
});

describe("nextHeaderHidden", () => {
  it("always shows the header near the top of the page", () => {
    expect(nextHeaderHidden(300, 40, true)).toBe(false);
  });
  it("hides when scrolling down and shows when scrolling up", () => {
    expect(nextHeaderHidden(100, 200, false)).toBe(true);
    expect(nextHeaderHidden(400, 300, true)).toBe(false);
  });
  it("ignores small jitters", () => {
    expect(nextHeaderHidden(200, 204, true)).toBe(true);
    expect(nextHeaderHidden(200, 196, false)).toBe(false);
  });
});
