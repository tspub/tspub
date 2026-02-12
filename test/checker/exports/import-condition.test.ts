import { describe, it, expect } from "vitest";
import { importConditionRule } from "../../../src/checker/rules/exports/import-condition.js";

const baseCtx = {
  dir: "/tmp",
  compilerOptions: null,
  hasBuildOutput: false,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

describe("exports/import-condition check", () => {
  it("returns empty when no exports field", async () => {
    const results = await importConditionRule.check({ ...baseCtx, pkg: {} });
    expect(results).toHaveLength(0);
  });

  it("returns empty for string shorthand exports", async () => {
    const results = await importConditionRule.check({
      ...baseCtx,
      pkg: { exports: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when dot entry has import condition", async () => {
    const results = await importConditionRule.check({
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

  it("returns empty when dot entry is a string", async () => {
    const results = await importConditionRule.check({
      ...baseCtx,
      pkg: { exports: { ".": "./dist/index.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when no dot entry and no sugar form", async () => {
    const results = await importConditionRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          "./utils": "./dist/utils.js",
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty for sugar-form with import condition", async () => {
    const results = await importConditionRule.check({
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

  it("returns empty when flat condition map has types but no import", async () => {
    const results = await importConditionRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            types: "./dist/index.d.ts",
            default: "./dist/index.js",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when flat condition map has default but no import", async () => {
    const results = await importConditionRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            default: "./dist/index.js",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns info when has require but no import (CJS-only)", async () => {
    const results = await importConditionRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            require: "./dist/index.cjs",
          },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("info");
    expect(results[0]!.message).toContain("CJS-only");
  });

  it("returns error when missing import and no types/default/require", async () => {
    const results = await importConditionRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": {
            node: "./dist/index.node.js",
          },
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("error");
    expect(results[0]!.message).toContain('missing "import" condition');
  });

  it("returns empty for sugar-form condition map with types", async () => {
    const results = await importConditionRule.check({
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

  it("returns info for sugar-form with require but no import", async () => {
    const results = await importConditionRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          require: "./dist/index.cjs",
        },
      },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("info");
    expect(results[0]!.message).toContain("CJS-only");
  });

  it("returns empty when mainExport is null (not object/string)", async () => {
    const results = await importConditionRule.check({
      ...baseCtx,
      pkg: {
        exports: {
          ".": 42 as unknown as Record<string, unknown>,
        },
      },
    });
    expect(results).toHaveLength(0);
  });
});

describe("exports/import-condition fix", () => {
  it("returns no-op when no exports", async () => {
    const pkg = {};
    const result = await importConditionRule.fix!({
      pkg,
      dir: "/tmp",
      distFiles: [],
    });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("returns no-op for string exports", async () => {
    const pkg = { exports: "./dist/index.js" };
    const result = await importConditionRule.fix!({
      pkg,
      dir: "/tmp",
      distFiles: [],
    });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("returns no-op when no dot entry", async () => {
    const pkg = {
      exports: { "./utils": "./dist/utils.js" } as Record<string, unknown>,
    };
    const result = await importConditionRule.fix!({
      pkg,
      dir: "/tmp",
      distFiles: [],
    });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("returns no-op when dot entry is a string", async () => {
    const pkg = {
      exports: { ".": "./dist/index.js" } as Record<string, unknown>,
    };
    const result = await importConditionRule.fix!({
      pkg,
      dir: "/tmp",
      distFiles: [],
    });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("returns no-op when import already exists", async () => {
    const pkg = {
      exports: {
        ".": {
          import: "./dist/index.js",
          require: "./dist/index.cjs",
        },
      } as Record<string, unknown>,
    };
    const result = await importConditionRule.fix!({
      pkg,
      dir: "/tmp",
      distFiles: [],
    });
    expect(result.pkgModified).toBe(false);
    expect(result.message).toBe("");
  });

  it("adds import condition when missing", async () => {
    const pkg = {
      exports: {
        ".": {
          require: "./dist/index.cjs",
        },
      } as Record<string, unknown>,
    };
    const result = await importConditionRule.fix!({
      pkg,
      dir: "/tmp",
      distFiles: [],
    });
    expect(result.pkgModified).toBe(true);
    expect(result.message).toContain('"import" condition');
    const dot = (pkg.exports as Record<string, unknown>)["."] as Record<
      string,
      unknown
    >;
    expect(dot.import).toBeDefined();
    const importObj = dot.import as Record<string, unknown>;
    expect(importObj.types).toBeDefined();
    expect(importObj.default).toBeDefined();
  });

  it("uses pkg.module for inferred entry path", async () => {
    const pkg = {
      module: "./lib/esm.js",
      types: "./lib/esm.d.ts",
      exports: {
        ".": {
          require: "./dist/index.cjs",
        },
      } as Record<string, unknown>,
    };
    const result = await importConditionRule.fix!({
      pkg,
      dir: "/tmp",
      distFiles: [],
    });
    expect(result.pkgModified).toBe(true);
    const dot = (pkg.exports as Record<string, unknown>)["."] as Record<
      string,
      unknown
    >;
    const importObj = dot.import as Record<string, unknown>;
    expect(importObj.default).toBe("./lib/esm.js");
    expect(importObj.types).toBe("./lib/esm.d.ts");
  });
});
