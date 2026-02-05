import { describe, it, expect } from "vitest";
import { moduleBeforeRequireRule } from "../../../src/checker/rules/exports/module-before-require.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/module-before-require", () => {
  it("warns when require comes before module", () => {
    const results = moduleBeforeRequireRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { require: "./dist/index.cjs", module: "./dist/index.mjs" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
  });

  it("passes when module comes before require", () => {
    const results = moduleBeforeRequireRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { module: "./dist/index.mjs", require: "./dist/index.cjs" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when only module exists", () => {
    const results = moduleBeforeRequireRule.check({
      ...baseCtx,
      pkg: {
        exports: { ".": { module: "./dist/index.mjs" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("fixes module/require order", () => {
    const pkg = {
      exports: {
        ".": { require: "./dist/index.cjs", module: "./dist/index.mjs" } as Record<string, unknown>,
      },
    };
    const result = moduleBeforeRequireRule.fix!({ pkg, dir: "/tmp", distFiles: [] });
    expect(result.pkgModified).toBe(true);
    const keys = Object.keys((pkg.exports as Record<string, unknown>)["."] as Record<string, unknown>);
    expect(keys.indexOf("module")).toBeLessThan(keys.indexOf("require"));
  });
});
