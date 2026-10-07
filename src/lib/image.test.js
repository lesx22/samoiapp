import { describe, it, expect } from "vitest";
import { fitWithin } from "./image";

describe("fitWithin", () => {
  it("scales a large landscape photo so its long edge is 1568px", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1568, height: 1176 });
  });

  it("scales a large portrait photo by its height", () => {
    expect(fitWithin(3024, 4032)).toEqual({ width: 1176, height: 1568 });
  });

  it("never enlarges a photo that is already small", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
