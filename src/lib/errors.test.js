import { describe, it, expect } from "vitest";
import { friendlyFetchError } from "./errors";

describe("friendlyFetchError", () => {
  it("never shows raw JSON", () => {
    const raw = 'API 401: {"type":"error","error":{"type":"authentication_error"}}';
    expect(friendlyFetchError(raw)).not.toMatch(/[{}]/);
    expect(friendlyFetchError(raw)).toMatch(/turned the request down/);
  });
  it("explains rate limits and outages", () => {
    expect(friendlyFetchError("API 429: slow down")).toMatch(/Wait a minute/);
    expect(friendlyFetchError("API 529: overloaded")).toMatch(/had a problem/);
  });
  it("has a fallback for anything else", () => {
    expect(friendlyFetchError("Could not parse JSON")).toMatch(/couldn't read enough/);
    expect(friendlyFetchError(null)).toMatch(/couldn't read enough/);
  });
});
