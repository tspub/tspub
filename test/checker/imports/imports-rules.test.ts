import { describe, it, expect } from "vitest";
import { walkImports } from "../../../src/checker/rules/utils/imports-traversal.js";
import { importsDefaultLastRule } from "../../../src/checker/rules/imports/default-last.js";
import { importsModuleBeforeRequireRule } from "../../../src/checker/rules/imports/module-before-require.js";
import { importsModuleEsmOnlyRule } from "../../../src/checker/rules/imports/module-esm-only.js";
import { importsFallbackArrayRule } from "../../../src/checker/rules/imports/fallback-array.js";
import { importsGlobMatchedFilesRule } from "../../../src/checker/rules/imports/glob-matched-files.js";
import { importsNoDeprecatedSubpathRule } from "../../../src/checker/rules/imports/no-deprecated-subpath.js";
import type { CheckContext, FixContext } from "../../../src/checker/framework/types.js";
import type { PackageJson } from "../../../src/shared/package-json.js";

const baseCtx = {
  dir: "/tmp",
  compilerOptions: null,
  hasBuildOutput: true,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

function makeCtx(pkg: PackageJson): CheckContext {
  return { ...baseCtx, pkg };
}

function makeFixCtx(pkg: PackageJson): FixContext {
  return { pkg, dir: baseCtx.dir, distFiles: [] };
}

// ---------------------------------------------------------------------------
// walkImports utility
// ---------------------------------------------------------------------------
describe("walkImports", () => {
  it("returns empty array for undefined input", () => {
    expect(walkImports(undefined)).toEqual([]);
  });

  it("returns empty array for null input", () => {
    expect(walkImports(null as unknown as undefined)).toEqual([]);
  });

  it("returns empty array for non-object input", () => {
    expect(walkImports("not-an-object" as unknown as undefined)).toEqual([]);
  });

  it("returns single entry for string value", () => {
    const result = walkImports({ "#a": "./a.js" });
    expect(result).toHaveLength(1);
    expect(result[0]!).toEqual({
      key: "#a",
      condition: "default",
      value: "./a.js",
      conditionKeys: [],
    });
  });

  it("returns entries with conditionKeys for object conditions", () => {
    const result = walkImports({
      "#a": { import: "./a.mjs", require: "./a.cjs" },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!).toEqual({
      key: "#a",
      condition: "import",
      value: "./a.mjs",
      conditionKeys: ["import", "require"],
    });
    expect(result[1]!).toEqual({
      key: "#a",
      condition: "require",
      value: "./a.cjs",
      conditionKeys: ["import", "require"],
    });
  });

  it("marks isFallbackArray for array values at top level", () => {
    const result = walkImports({ "#a": ["./a.mjs", "./a.cjs"] });
    expect(result).toHaveLength(2);
    expect(result[0]!).toEqual({
      key: "#a",
      condition: "default",
      value: "./a.mjs",
      conditionKeys: [],
      isFallbackArray: true,
    });
    expect(result[1]!).toEqual({
      key: "#a",
      condition: "default",
      value: "./a.cjs",
      conditionKeys: [],
      isFallbackArray: true,
    });
  });

  it("marks isFallbackArray for array values in condition objects", () => {
    const result = walkImports({
      "#a": { import: ["./a.mjs", "./a.js"] },
    });
    expect(result).toHaveLength(2);
    for (const entry of result) {
      expect(entry.isFallbackArray).toBe(true);
      expect(entry.condition).toBe("import");
      expect(entry.conditionKeys).toEqual(["import"]);
    }
  });

  it("handles nested conditions", () => {
    const result = walkImports({
      "#a": {
        node: { import: "./a.mjs", require: "./a.cjs" },
        default: "./a.js",
      },
    });
    expect(result).toHaveLength(3);
    const nodeImport = result.find((e) => e.condition === "import");
    expect(nodeImport).toBeDefined();
    expect(nodeImport!.value).toBe("./a.mjs");
    const nodeRequire = result.find((e) => e.condition === "require");
    expect(nodeRequire).toBeDefined();
    expect(nodeRequire!.value).toBe("./a.cjs");
    const defaultEntry = result.find((e) => e.condition === "default");
    expect(defaultEntry).toBeDefined();
    expect(defaultEntry!.value).toBe("./a.js");
  });

  it("handles nested conditions with arrays", () => {
    const result = walkImports({
      "#a": {
        node: { import: ["./a.mjs", "./a.js"] },
      },
    });
    expect(result).toHaveLength(2);
    for (const entry of result) {
      expect(entry.isFallbackArray).toBe(true);
      expect(entry.condition).toBe("import");
    }
  });

  it("handles array at top level with object items", () => {
    const result = walkImports({
      "#a": [{ import: "./a.mjs" }, "./a.cjs"],
    });
    expect(result).toHaveLength(2);
    const importEntry = result.find((e) => e.condition === "import");
    expect(importEntry).toBeDefined();
    expect(importEntry!.value).toBe("./a.mjs");
    const fallbackEntry = result.find((e) => e.condition === "default");
    expect(fallbackEntry).toBeDefined();
    expect(fallbackEntry!.value).toBe("./a.cjs");
    expect(fallbackEntry!.isFallbackArray).toBe(true);
  });

  it("ignores non-# keys", () => {
    const result = walkImports({
      utils: "./src/utils.js",
      "#internal": "./src/internal.js",
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.key).toBe("#internal");
  });

  it("handles multiple # keys", () => {
    const result = walkImports({
      "#a": "./a.js",
      "#b": "./b.js",
      "#c": { import: "./c.mjs" },
    });
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.key)).toEqual(["#a", "#b", "#c"]);
  });

  it("returns empty array for empty object", () => {
    expect(walkImports({})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// imports/default-last
// ---------------------------------------------------------------------------
describe("imports/default-last", () => {
  it("returns no warnings when no imports field", async () => {
    const diags = await importsDefaultLastRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("passes when default is the last condition key", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { import: "./utils.mjs", require: "./utils.cjs", default: "./utils.js" },
      },
    };
    const diags = await importsDefaultLastRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("errors when default is not the last condition key", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { default: "./utils.js", import: "./utils.mjs" },
      },
    };
    const diags = await importsDefaultLastRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("error");
    expect(diags[0]!.message).toContain('"default" must be the last condition key');
    expect(diags[0]!.message).toContain("#utils");
  });

  it("errors for each subpath with default not last", async () => {
    const pkg: PackageJson = {
      imports: {
        "#a": { default: "./a.js", import: "./a.mjs" },
        "#b": { default: "./b.js", require: "./b.cjs" },
      },
    };
    const diags = await importsDefaultLastRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(2);
    expect(diags[0]!.message).toContain("#a");
    expect(diags[1]!.message).toContain("#b");
  });

  it("skips string shorthand (no conditionKeys)", async () => {
    const pkg: PackageJson = {
      imports: { "#utils": "./utils.js" },
    };
    const diags = await importsDefaultLastRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("passes when default is only key", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { default: "./utils.js" },
      },
    };
    const diags = await importsDefaultLastRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("fix reorders default to last position", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { default: "./utils.js", import: "./utils.mjs", require: "./utils.cjs" },
      },
    };
    const result = await importsDefaultLastRule.fix!(makeFixCtx(pkg));
    expect(result.pkgModified).toBe(true);
    expect(result.message).toContain("moved");
    const keys = Object.keys(
      (pkg.imports as Record<string, Record<string, unknown>>)["#utils"]!,
    );
    expect(keys[keys.length - 1]).toBe("default");
  });

  it("fix does nothing when already correct", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { import: "./utils.mjs", default: "./utils.js" },
      },
    };
    const result = await importsDefaultLastRule.fix!(makeFixCtx(pkg));
    expect(result.pkgModified).toBe(false);
  });

  it("fix returns pkgModified false when no imports", async () => {
    const result = await importsDefaultLastRule.fix!(makeFixCtx({}));
    expect(result.pkgModified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// imports/module-before-require
// ---------------------------------------------------------------------------
describe("imports/module-before-require", () => {
  it("returns no warnings when no imports field", async () => {
    const diags = await importsModuleBeforeRequireRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("passes when module comes before require", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "./utils.mjs", require: "./utils.cjs" },
      },
    };
    const diags = await importsModuleBeforeRequireRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("warns when require comes before module", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { require: "./utils.cjs", module: "./utils.mjs" },
      },
    };
    const diags = await importsModuleBeforeRequireRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("warning");
    expect(diags[0]!.message).toContain('"module" should come before "require"');
    expect(diags[0]!.message).toContain("#utils");
  });

  it("passes when only module is present (no require)", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "./utils.mjs", default: "./utils.js" },
      },
    };
    const diags = await importsModuleBeforeRequireRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("passes when only require is present (no module)", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { require: "./utils.cjs", default: "./utils.js" },
      },
    };
    const diags = await importsModuleBeforeRequireRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("warns for each subpath with incorrect order", async () => {
    const pkg: PackageJson = {
      imports: {
        "#a": { require: "./a.cjs", module: "./a.mjs" },
        "#b": { require: "./b.cjs", module: "./b.mjs" },
      },
    };
    const diags = await importsModuleBeforeRequireRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(2);
    expect(diags[0]!.message).toContain("#a");
    expect(diags[1]!.message).toContain("#b");
  });

  it("fix reorders module before require", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { require: "./utils.cjs", module: "./utils.mjs", default: "./utils.js" },
      },
    };
    const result = await importsModuleBeforeRequireRule.fix!(makeFixCtx(pkg));
    expect(result.pkgModified).toBe(true);
    expect(result.message).toContain("moved");
    const keys = Object.keys(
      (pkg.imports as Record<string, Record<string, unknown>>)["#utils"]!,
    );
    expect(keys.indexOf("module")).toBeLessThan(keys.indexOf("require"));
  });

  it("fix does nothing when order is already correct", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "./utils.mjs", require: "./utils.cjs" },
      },
    };
    const result = await importsModuleBeforeRequireRule.fix!(makeFixCtx(pkg));
    expect(result.pkgModified).toBe(false);
  });

  it("fix returns pkgModified false when no imports", async () => {
    const result = await importsModuleBeforeRequireRule.fix!(makeFixCtx({}));
    expect(result.pkgModified).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// imports/module-esm-only (needs filesystem, minimal testing)
// ---------------------------------------------------------------------------
describe("imports/module-esm-only", () => {
  it("returns no warnings when no imports field", async () => {
    const diags = await importsModuleEsmOnlyRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("returns no warnings when hasBuildOutput is false", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { module: "./utils.mjs", require: "./utils.cjs" },
      },
    };
    const ctx = { ...baseCtx, pkg, hasBuildOutput: false };
    const diags = await importsModuleEsmOnlyRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("has correct metadata", () => {
    expect(importsModuleEsmOnlyRule.meta.id).toBe("imports/module-esm-only");
    expect(importsModuleEsmOnlyRule.meta.category).toBe("imports");
    expect(importsModuleEsmOnlyRule.meta.fixable).toBe(false);
    expect(importsModuleEsmOnlyRule.meta.defaultSeverity).toBe("warning");
  });

  it("is not fixable", () => {
    expect(importsModuleEsmOnlyRule.fix).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// imports/fallback-array
// ---------------------------------------------------------------------------
describe("imports/fallback-array", () => {
  it("returns no warnings when no imports field", async () => {
    const diags = await importsFallbackArrayRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("warns when top-level array values are used", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": ["./utils.mjs", "./utils.cjs"],
      },
    };
    const diags = await importsFallbackArrayRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("warning");
    expect(diags[0]!.message).toContain("fallback array");
    expect(diags[0]!.message).toContain("#utils");
  });

  it("warns when condition value is an array", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { import: ["./utils.mjs", "./utils.js"] },
      },
    };
    const diags = await importsFallbackArrayRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.message).toContain("fallback array");
    expect(diags[0]!.message).toContain("#utils");
  });

  it("passes when no fallback arrays are used", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { import: "./utils.mjs", require: "./utils.cjs" },
      },
    };
    const diags = await importsFallbackArrayRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("passes with string shorthand", async () => {
    const pkg: PackageJson = {
      imports: { "#utils": "./utils.js" },
    };
    const diags = await importsFallbackArrayRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("reports only once per key even with multiple array conditions", async () => {
    const pkg: PackageJson = {
      imports: {
        "#a": {
          import: ["./a.mjs", "./a.js"],
          require: ["./a.cjs", "./a.js"],
        },
      },
    };
    const diags = await importsFallbackArrayRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.message).toContain("#a");
  });

  it("warns separately for different keys with arrays", async () => {
    const pkg: PackageJson = {
      imports: {
        "#a": ["./a.mjs", "./a.js"],
        "#b": ["./b.mjs", "./b.js"],
      },
    };
    const diags = await importsFallbackArrayRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(2);
  });

  it("is not fixable", () => {
    expect(importsFallbackArrayRule.fix).toBeUndefined();
    expect(importsFallbackArrayRule.meta.fixable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// imports/glob-matched-files (needs filesystem, minimal testing)
// ---------------------------------------------------------------------------
describe("imports/glob-matched-files", () => {
  it("returns no warnings when no imports field", async () => {
    const diags = await importsGlobMatchedFilesRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("returns no warnings when hasBuildOutput is false", async () => {
    const pkg: PackageJson = {
      imports: {
        "#internal/*": "./src/*.js",
      },
    };
    const ctx = { ...baseCtx, pkg, hasBuildOutput: false };
    const diags = await importsGlobMatchedFilesRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("has correct metadata", () => {
    expect(importsGlobMatchedFilesRule.meta.id).toBe("imports/glob-matched-files");
    expect(importsGlobMatchedFilesRule.meta.category).toBe("imports");
    expect(importsGlobMatchedFilesRule.meta.fixable).toBe(false);
    expect(importsGlobMatchedFilesRule.meta.defaultSeverity).toBe("warning");
  });

  it("is not fixable", () => {
    expect(importsGlobMatchedFilesRule.fix).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// imports/no-deprecated-subpath
// ---------------------------------------------------------------------------
describe("imports/no-deprecated-subpath", () => {
  it("returns no warnings when no imports field", async () => {
    const diags = await importsNoDeprecatedSubpathRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("warns on trailing / in imports keys", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils/": "./src/utils/",
      },
    };
    const diags = await importsNoDeprecatedSubpathRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("warning");
    expect(diags[0]!.message).toContain("#utils/");
    expect(diags[0]!.message).toContain("deprecated trailing");
    expect(diags[0]!.message).toContain("#utils/*");
  });

  it("passes when keys use * pattern instead of trailing /", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils/*": "./src/utils/*.js",
      },
    };
    const diags = await importsNoDeprecatedSubpathRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("passes with normal keys without trailing /", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": "./src/utils.js",
        "#internal": { import: "./src/internal.mjs" },
      },
    };
    const diags = await importsNoDeprecatedSubpathRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("warns for multiple keys with trailing /", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils/": "./src/utils/",
        "#internal/": "./src/internal/",
      },
    };
    const diags = await importsNoDeprecatedSubpathRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(2);
    expect(diags[0]!.message).toContain("#utils/");
    expect(diags[1]!.message).toContain("#internal/");
  });

  it("does not warn for #/ key", async () => {
    const pkg: PackageJson = {
      imports: {
        "#/": "./src/",
      },
    };
    const diags = await importsNoDeprecatedSubpathRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("ignores non-# keys with trailing /", async () => {
    const pkg: PackageJson = {
      imports: {
        "utils/": "./src/utils/",
        "#valid": "./valid.js",
      },
    };
    const diags = await importsNoDeprecatedSubpathRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  it("is not fixable", () => {
    expect(importsNoDeprecatedSubpathRule.fix).toBeUndefined();
    expect(importsNoDeprecatedSubpathRule.meta.fixable).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rule metadata sanity checks
// ---------------------------------------------------------------------------
describe("imports rule metadata", () => {
  const rules = [
    importsDefaultLastRule,
    importsModuleBeforeRequireRule,
    importsModuleEsmOnlyRule,
    importsFallbackArrayRule,
    importsGlobMatchedFilesRule,
    importsNoDeprecatedSubpathRule,
  ];

  it("all rules have category imports", () => {
    for (const rule of rules) {
      expect(rule.meta.category).toBe("imports");
    }
  });

  it("all rule ids start with imports/", () => {
    for (const rule of rules) {
      expect(rule.meta.id.startsWith("imports/")).toBe(true);
    }
  });

  it("all rules have a description", () => {
    for (const rule of rules) {
      expect(rule.meta.description.length).toBeGreaterThan(0);
    }
  });
});
