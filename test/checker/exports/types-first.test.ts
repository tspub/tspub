import { describe, it, expect } from "vitest";
import { typesOrderRule } from "../../../src/checker/rules/exports/types-order.js";

const baseCtx = { dir: "/tmp", compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/types-order (types-first)", () => {
  it("errors when types comes after import", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("error");
  });

  it("passes when types comes first", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("errors when types comes after default in nested import", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            import: { default: "./dist/index.js", types: "./dist/index.d.ts" },
          },
        },
      },
    });
    expect(results).toHaveLength(1);
  });

  it("passes with sugar form where types is first", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: { types: "./dist/index.d.ts", import: "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("fixes types order in flat condition map", async () => {
    const pkg = {
      exports: {
        ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } as Record<string, unknown>,
      },
    };
    const result = await typesOrderRule.fix!({ pkg, dir: "/tmp", distFiles: [] });
    expect(result.pkgModified).toBe(true);
    const keys = Object.keys((pkg.exports as Record<string, unknown>)["."] as Record<string, unknown>);
    expect(keys[0]!).toBe("types");
  });
});
