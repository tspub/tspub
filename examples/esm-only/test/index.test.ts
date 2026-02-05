import { describe, it, expect } from "vitest";
import { capitalize, slugify } from "../src/index.js";

describe("example-esm-only", () => {
  it("capitalizes strings", () => {
    expect(capitalize("hello")).toBe("Hello");
  });

  it("slugifies strings", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
  });
});
