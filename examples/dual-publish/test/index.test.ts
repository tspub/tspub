import { describe, it, expect } from "vitest";
import { add, multiply, clamp } from "../src/index.js";

describe("example-dual-publish", () => {
  it("adds numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("multiplies numbers", () => {
    expect(multiply(4, 5)).toBe(20);
  });

  it("clamps values", () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });
});
