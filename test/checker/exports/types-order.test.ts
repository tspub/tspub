import { describe, it, expect } from "vitest";
import { typesOrderRule } from "../../../src/checker/rules/exports/types-order.js";

const baseCtx = {
  dir: "/tmp",
  compilerOptions: null,
  hasBuildOutput: true,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

const baseFixCtx = { dir: "/tmp", distFiles: [] as string[] };

describe("exports/types-order check()", () => {
  it("returns empty when no exports", async () => {
    const results = await typesOrderRule.check({ ...baseCtx, pkg: {} });
    expect(results).toHaveLength(0);
  });

  it("returns empty when exports is a string", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: { exports: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when no '.' entry and not a sugar form", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: { exports: { "./utils": "./dist/utils.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when '.' is not an object", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: { exports: { ".": "./dist/index.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("errors when types comes after import in flat condition map", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("warning");
    expect(results[0]!.message).toContain("types should come BEFORE");
  });

  it("errors when types comes after require", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { require: "./dist/index.cjs", types: "./dist/index.d.ts" },
        },
      },
    });
    expect(results).toHaveLength(1);
  });

  it("errors when types comes after default", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": { default: "./dist/index.js", types: "./dist/index.d.ts" },
        },
      },
    });
    expect(results).toHaveLength(1);
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

  it("passes with sugar form where types is first", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: { types: "./dist/index.d.ts", import: "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("errors when sugar form has types after import", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: { import: "./dist/index.js", types: "./dist/index.d.ts" },
      },
    });
    expect(results).toHaveLength(1);
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
    expect(results[0]!.message).toContain("import.types should come BEFORE");
  });

  it("errors when types comes after default in nested require", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            require: { default: "./dist/index.cjs", types: "./dist/index.d.cts" },
          },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("require.types should come BEFORE");
  });

  it("passes when nested import has types first", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when nested require has types first", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("reports both flat and nested errors together", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            import: { default: "./dist/index.js", types: "./dist/index.d.ts" },
            require: { default: "./dist/index.cjs", types: "./dist/index.d.cts" },
          },
        },
      },
    });
    expect(results).toHaveLength(2);
  });

  it("reports flat + nested when both are wrong", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            import: { default: "./dist/index.js", types: "./dist/index.d.ts" },
            types: "./dist/index.d.ts",
            default: "./dist/index.js",
          },
        },
      },
    });
    // flat types after import + nested import.types after default = 2
    // But flat: types is at index 1, import is at index 0 => error
    // Actually: keys are ["import", "types", "default"]
    // typesIdx=1, importIdx=0, firstNonTypes=0 => 1>0 => error
    // nested import: default at 0, types at 1 => error
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("no error when types is object (not string) in flat map", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            import: "./dist/index.js",
            types: { default: "./dist/index.d.ts" },
          },
        },
      },
    });
    // types is not a string, so the flat check is skipped
    expect(results).toHaveLength(0);
  });

  it("skips nested check when import value is a string", async () => {
    const results = await typesOrderRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            types: "./dist/index.d.ts",
            import: "./dist/index.js",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });
});

describe("exports/types-order fix()", () => {
  it("returns no-op when no exports", async () => {
    const pkg = {};
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("returns no-op when exports is a string", async () => {
    const pkg = { exports: "./dist/index.js" };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("returns no-op when dot entry is not an object", async () => {
    const pkg = { exports: { ".": "./dist/index.js" } };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("returns no-op when no condition map and no dot entry", async () => {
    const pkg = { exports: { "./utils": "./dist/utils.js" } };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("reorders types to first in flat condition map", async () => {
    const pkg = {
      exports: {
        ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } as Record<string, unknown>,
      },
    };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(true);
    expect(result.message).toContain("reordered");
    const keys = Object.keys(
      (pkg.exports as Record<string, unknown>)["."] as Record<string, unknown>,
    );
    expect(keys[0]!).toBe("types");
    expect(keys[1]!).toBe("import");
  });

  it("reorders types in sugar form exports", async () => {
    const pkg = {
      exports: { import: "./dist/index.js", types: "./dist/index.d.ts" } as Record<string, unknown>,
    };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(true);
    const keys = Object.keys(pkg.exports as Record<string, unknown>);
    expect(keys[0]!).toBe("types");
  });

  it("reorders types in nested import condition", async () => {
    const pkg = {
      exports: {
        ".": {
          import: { default: "./dist/index.js", types: "./dist/index.d.ts" },
        } as Record<string, unknown>,
      },
    };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(true);
    const dot = (pkg.exports as Record<string, Record<string, Record<string, string>>>)["."]!;
    const importKeys = Object.keys(dot["import"]!);
    expect(importKeys[0]!).toBe("types");
    expect(importKeys[1]!).toBe("default");
  });

  it("reorders types in nested require condition", async () => {
    const pkg = {
      exports: {
        ".": {
          require: { default: "./dist/index.cjs", types: "./dist/index.d.cts" },
        } as Record<string, unknown>,
      },
    };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(true);
    const dot = (pkg.exports as Record<string, Record<string, Record<string, string>>>)["."]!;
    const requireKeys = Object.keys(dot["require"]!);
    expect(requireKeys[0]!).toBe("types");
    expect(requireKeys[1]!).toBe("default");
  });

  it("fixes both flat and nested ordering", async () => {
    const pkg = {
      exports: {
        ".": {
          import: { default: "./dist/index.js", types: "./dist/index.d.ts" },
          require: { default: "./dist/index.cjs", types: "./dist/index.d.cts" },
          types: "./dist/index.d.ts",
          default: "./dist/index.js",
        } as Record<string, unknown>,
      },
    };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(true);
    const dot = (pkg.exports as Record<string, Record<string, unknown>>)["."]!;
    // flat: types should now be first
    expect(Object.keys(dot)[0]!).toBe("types");
  });

  it("no-op when types already first everywhere", async () => {
    const pkg = {
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
          require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
          default: "./dist/index.js",
        } as Record<string, unknown>,
      },
    };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("no-op when no types key in flat map", async () => {
    const pkg = {
      exports: {
        ".": {
          import: "./dist/index.js",
          default: "./dist/index.cjs",
        } as Record<string, unknown>,
      },
    };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
  });

  it("no-op when nested condition has no types key", async () => {
    const pkg = {
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: { default: "./dist/index.js" },
        } as Record<string, unknown>,
      },
    };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
  });

  it("no-op when nested condition has no default key", async () => {
    const pkg = {
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: { types: "./dist/index.d.ts", node: "./dist/index.node.js" },
        } as Record<string, unknown>,
      },
    };
    const result = await typesOrderRule.fix!({ ...baseFixCtx, pkg });
    expect(result.pkgModified).toBe(false);
  });
});
