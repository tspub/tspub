import { describe, it, expect } from "vitest";
import { esmMainNoExportsRule } from "../../../src/checker/rules/exports/esm-main-no-exports.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: false, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/esm-main-no-exports", () => {
  it("warns when main is .mjs with no exports", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      pkg: { main: "./dist/index.mjs" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("ESM");
  });

  it("warns when main is .js with type=module and no exports", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      pkg: { main: "./dist/index.js", type: "module" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("ESM");
  });

  it("passes when exports field exists", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      pkg: { main: "./dist/index.mjs", exports: { ".": "./dist/index.mjs" } },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when main is CJS", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      pkg: { main: "./dist/index.cjs" },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no main field", async () => {
    const results = await esmMainNoExportsRule.check({
      ...baseCtx,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });
});
