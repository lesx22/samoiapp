import { describe, it, expect } from "vitest";
import { linkPlaceholderName } from "./links";

describe("linkPlaceholderName", () => {
  it("names the site, so a failed add is still recognisable", () => {
    expect(linkPlaceholderName("https://www.johnnyseeds.com/flowers/celosia/")).toBe("Plant from johnnyseeds.com");
  });
  it("falls back when the link is not a valid URL", () => {
    expect(linkPlaceholderName("not a link")).toBe("Plant from a link");
  });
});
