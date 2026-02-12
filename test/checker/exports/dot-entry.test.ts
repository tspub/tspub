import { describe, it, expect } from "vitest";
import { dotEntryRule } from "../../../src/checker/rules/exports/dot-entry.js";

const baseCtx = {
  dir: "/tmp",
  compilerOptions: null,
  hasBuildOutput: false,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

describe("exports/dot-entry check", () => {
  it("returns empty when no exports field", async () => {
    const results = await dotEntryRule.check({ ...baseCtx, pkg: {} });
    expect(results).toHaveLength(0);
  });

  it("returns empty for string shorthand exports", async () => {
    const results = await dotEntryRule.check({
      ...baseCtx,
      pkg: { exports: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when dot entry exists", async () => {
    const results = await dotEntryRule.check({
      ...baseCtx,
      pkg: { exports: { ".": "./dist/index.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty for sugar-form condition map (import)", async () => {
    const results = await dotEntryRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          import: "./dist/index.js",
          require: "./dist/index.cjs",
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty for sugar-form condition map (types)", async () => {
    const results = await dotEntryRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          types: "./dist/index.d.ts",
          default: "./dist/index.js",
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty for sugar-form with node condition", async () => {
    const results = await dotEntryRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          node: "./dist/index.node.js",
          default: "./dist/index.js",
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty for sugar-form with browser condition", async () => {
    const results = await dotEntryRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          browser: "./dist/index.browser.js",
          default: "./dist/index.js",
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns info when subpath entries exist but no dot entry", async () => {
    const results = await dotEntryRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          "./utils": "./dist/utils.js",
          "./helpers": "./dist/helpers.js",
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("info");
    expect(results[0]!.message).toContain("no \".\"");
    expect(results[0]!.message).toContain("intentional");
  });

  it("returns error for exports with unknown non-subpath keys", async () => {
    const results = await dotEntryRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          foo: "./dist/foo.js",
          bar: "./dist/bar.js",
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("error");
    expect(results[0]!.message).toContain('exports missing "." entry');
  });

  it("returns empty when dot entry has object value", async () => {
    const results = await dotEntryRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            import: "./dist/index.js",
            require: "./dist/index.cjs",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });
});

describe("exports/dot-entry fix", () => {
  it("returns no-op when no exports", async () => {
    const pkg = {};
    const result = await dotEntryRule.fix!({ pkg, dir: "/tmp", distFiles: [] });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("returns no-op for string exports", async () => {
    const pkg = { exports: "./dist/index.js" };
    const result = await dotEntryRule.fix!({ pkg, dir: "/tmp", distFiles: [] });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("returns no-op when dot entry already exists", async () => {
    const pkg = {
      exports: { ".": { import: "./dist/index.js" } } as Record<
        string,
        unknown
      >,
    };
    const result = await dotEntryRule.fix!({ pkg, dir: "/tmp", distFiles: [] });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("adds dot entry for type=module package", async () => {
    const pkg = {
      type: "module",
      exports: { "./utils": "./dist/utils.js" } as Record<string, unknown>,
    };
    const result = await dotEntryRule.fix!({ pkg, dir: "/tmp", distFiles: [] });
    expect(result.pkgModified).toBe(true);
    expect(result.message).toContain('"." entry');
    const dot = (pkg.exports as Record<string, unknown>)["."] as Record<
      string,
      unknown
    >;
    expect(dot).toBeDefined();
    expect(dot.import).toBeDefined();
    const importObj = dot.import as Record<string, unknown>;
    expect(importObj.types).toBeDefined();
    expect(importObj.default).toBeDefined();
  });

  it("adds dot entry for CJS package (no type=module)", async () => {
    const pkg = {
      exports: { "./utils": "./dist/utils.js" } as Record<string, unknown>,
    };
    const result = await dotEntryRule.fix!({ pkg, dir: "/tmp", distFiles: [] });
    expect(result.pkgModified).toBe(true);
    expect(result.message).toContain('"." entry');
    const dot = (pkg.exports as Record<string, unknown>)["."] as Record<
      string,
      unknown
    >;
    expect(dot).toBeDefined();
    expect(dot.types).toBeDefined();
    expect(dot.default).toBeDefined();
    // For CJS packages, no nested import wrapper
    expect(dot.import).toBeUndefined();
  });

  it("infers entry paths from distFiles", async () => {
    const pkg = {
      type: "module",
      exports: { "./sub": "./dist/sub.js" } as Record<string, unknown>,
    };
    const result = await dotEntryRule.fix!({
      pkg,
      dir: "/tmp",
      distFiles: ["index.mjs", "index.d.mts"],
    });
    expect(result.pkgModified).toBe(true);
    const dot = (pkg.exports as Record<string, unknown>)["."] as Record<
      string,
      unknown
    >;
    const importObj = dot.import as Record<string, unknown>;
    expect(importObj.default).toBe("./dist/index.mjs");
    expect(importObj.types).toBe("./dist/index.d.mts");
  });

  it("uses pkg.main and pkg.types when available", async () => {
    const pkg = {
      main: "./lib/main.js",
      types: "./lib/main.d.ts",
      exports: { "./foo": "./lib/foo.js" } as Record<string, unknown>,
    };
    const result = await dotEntryRule.fix!({ pkg, dir: "/tmp", distFiles: [] });
    expect(result.pkgModified).toBe(true);
    const dot = (pkg.exports as Record<string, unknown>)["."] as Record<
      string,
      unknown
    >;
    expect(dot.default).toBe("./lib/main.js");
    expect(dot.types).toBe("./lib/main.d.ts");
  });
});
