import { describe, it, expect } from "vitest";
import { moduleNoExportsRule } from "../../../src/checker/rules/exports/module-no-exports.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: false, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/module-no-exports", () => {
  it("warns when module field exists without exports", () => {
    const results = moduleNoExportsRule.check({
      ...baseCtx,
      pkg: { module: "./dist/index.esm.js" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("module");
    expect(results[0]!.message).toContain("exports");
  });

  it("passes when exports field exists", () => {
    const results = moduleNoExportsRule.check({
      ...baseCtx,
      pkg: { module: "./dist/index.esm.js", exports: { ".": "./dist/index.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no module field", () => {
    const results = moduleNoExportsRule.check({
      ...baseCtx,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });
});
