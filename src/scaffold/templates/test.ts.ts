import type { ScaffoldOptions } from "../index.js";

export function generateTestTs(options: ScaffoldOptions): string {
  return `import { describe, it, expect } from "vitest";
import { greet } from "../src/index.js";

describe("${options.name}", () => {
  it("should greet", () => {
    expect(greet("World")).toBe("Hello, World!");
  });
});
`;
}
