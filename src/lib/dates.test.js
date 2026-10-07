import { describe, it, expect } from "vitest";
import { localDateString } from "./dates";

describe("localDateString", () => {
  it("uses the local calendar day, not UTC", () => {
    // 00:30 local time on 8 October; in UTC this can still be 7 October
    expect(localDateString(new Date(2026, 9, 8, 0, 30))).toBe("2026-10-08");
  });

  it("pads single-digit months and days", () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
