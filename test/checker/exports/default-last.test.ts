import { describe, it, expect } from "vitest";
import { defaultLastRule } from "../../../src/checker/rules/exports/default-last.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/default-last", () => {
  it("errors when default is not last", () => {
    const results = defaultLastRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { default: "./dist/index.js", import: "./dist/index.mjs" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("error");
    expect(results[0]!.message).toContain("default");
  });

  it("passes when default is last", () => {
    const results = defaultLastRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { import: "./dist/index.mjs", default: "./dist/index.js" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes with no exports", () => {
    const results = defaultLastRule.check({ ...baseCtx, pkg: {} });
    expect(results).toHaveLength(0);
  });

  it("passes with string exports", () => {
    const results = defaultLastRule.check({ ...baseCtx, pkg: { exports: "./dist/index.js" } });
    expect(results).toHaveLength(0);
  });

  it("fixes default order", () => {
    const pkg = {
      exports: {
        ".": { default: "./dist/index.js", import: "./dist/index.mjs" } as Record<string, unknown>,
      },
    };
    const result = defaultLastRule.fix!({ pkg, dir: "/tmp", distFiles: [] });
    expect(result.pkgModified).toBe(true);
    const keys = Object.keys((pkg.exports as Record<string, unknown>)["."] as Record<string, unknown>);
    expect(keys[keys.length - 1]).toBe("default");
  });
});
