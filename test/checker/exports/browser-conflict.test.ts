import { describe, it, expect } from "vitest";
import { browserConflictRule } from "../../../src/checker/rules/exports/browser-conflict.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/browser-conflict", () => {
  it("warns when both browser and exports exist", async () => {
    const results = await browserConflictRule.check({ ...baseCtx, pkg: { browser: "./dist/browser.js", exports: { ".": "./dist/index.js" } } });
    expect(results).toHaveLength(1);
  });

  it("passes with exports only", async () => {
    const results = await browserConflictRule.check({ ...baseCtx, pkg: { exports: { ".": "./dist/index.js" } } });
    expect(results).toHaveLength(0);
  });

  it("passes with browser only", async () => {
    const results = await browserConflictRule.check({ ...baseCtx, pkg: { browser: "./dist/browser.js" } });
    expect(results).toHaveLength(0);
  });
});
