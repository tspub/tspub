import { describe, it, expect } from "vitest";
import { resolutionRule } from "../../../src/checker/rules/types/resolution.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: false, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("types/resolution multi-mode", () => {
  it("reports missing types condition", async () => {
    const results = await resolutionRule.check({
      ...baseCtx,
      pkg: { name: "test-pkg", exports: { ".": { import: "./dist/index.js" } } },
    });
    expect(results.some(r => r.message.includes("no \"types\" condition"))).toBe(true);
  });

  it("passes valid exports with types", async () => {
    const results = await resolutionRule.check({
      ...baseCtx,
      pkg: { name: "test-pkg", type: "module", exports: { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } } },
    });
    const errors = results.filter(r => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("skips string exports", async () => {
    const results = await resolutionRule.check({
      ...baseCtx,
      pkg: { name: "test-pkg", exports: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });
});
