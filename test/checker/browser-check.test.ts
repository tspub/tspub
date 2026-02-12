import { describe, it, expect } from "vitest";
import {
  checkPackageJson,
  fixPackageJson,
  browserRules,
  TOTAL_RULES,
} from "../../src/checker/browser.js";

describe("checkPackageJson", () => {
  it("returns empty array for minimal valid package", () => {
    const results = checkPackageJson({
      name: "my-pkg",
      version: "1.0.0",
      type: "module",
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
      },
      files: ["dist"],
      license: "MIT",
      sideEffects: false,
      engines: { node: ">=18.0.0" },
      repository: { type: "git", url: "https://github.com/user/repo" },
      scripts: { prepublishOnly: "tspub build" },
    });
    expect(results).toEqual([]);
  });

  it("returns diagnostics for package with issues", () => {
    const results = checkPackageJson({
      name: "bad-pkg",
      version: "1.0.0",
      exports: {
        ".": { import: "./dist/index.js" },
      },
    });
    expect(results.length).toBeGreaterThan(0);
    // Missing type: module with ESM exports should produce a diagnostic
    const typeModuleResult = results.find((r) => r.ruleId === "exports/type-module");
    expect(typeModuleResult).toBeDefined();
    expect(typeModuleResult!.message).toContain("type");
  });

  it("each result has ruleId, severity, message, category, fixable, publint, attw fields", () => {
    const results = checkPackageJson({
      name: "test-pkg",
      version: "1.0.0",
      exports: {
        ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
      },
    });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("ruleId");
      expect(r).toHaveProperty("severity");
      expect(r).toHaveProperty("message");
      expect(r).toHaveProperty("category");
      expect(r).toHaveProperty("fixable");
      expect(r).toHaveProperty("publint");
      expect(r).toHaveProperty("attw");
      expect(typeof r.ruleId).toBe("string");
      expect(typeof r.severity).toBe("string");
      expect(typeof r.message).toBe("string");
      expect(typeof r.category).toBe("string");
    }
  });

  it("compilerOptions parameter affects types rules", () => {
    const pkg = {
      name: "tsconfig-pkg",
      version: "1.0.0",
      type: "module" as const,
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
      },
      files: ["dist"],
      license: "MIT",
      sideEffects: false,
      engines: { node: ">=18.0.0" },
      repository: { type: "git", url: "https://github.com/user/repo" },
      scripts: { prepublishOnly: "tspub build" },
    };

    const withoutOpts = checkPackageJson(pkg, null);
    const withOpts = checkPackageJson(pkg, {
      module: "commonjs",
    });

    // Without compilerOptions, types rules skip (return [])
    const typesWithout = withoutOpts.filter((r) => r.category === "types");
    expect(typesWithout).toHaveLength(0);

    // With compilerOptions that have issues, types rules fire
    const typesWith = withOpts.filter((r) => r.category === "types");
    expect(typesWith.length).toBeGreaterThan(0);
    expect(typesWith.some((r) => r.ruleId === "types/module")).toBe(true);
  });

  it("category is correctly extracted from ruleId", () => {
    const results = checkPackageJson({
      name: "cat-pkg",
      version: "1.0.0",
    });
    for (const r of results) {
      const expectedCategory = r.ruleId.split("/")[0];
      expect(r.category).toBe(expectedCategory);
    }
  });
});

describe("fixPackageJson", () => {
  it("applies fixable results to a cloned package", () => {
    const pkg = {
      name: "fix-pkg",
      version: "1.0.0",
      exports: {
        ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
      },
    };
    const results = checkPackageJson(pkg);
    const fixableResults = results.filter((r) => r.fixable);
    expect(fixableResults.length).toBeGreaterThan(0);

    const fixed = fixPackageJson(pkg, results);
    // Should return a different object (cloned)
    expect(fixed).not.toBe(pkg);
    // The types-first fix should have reordered types to be first
    const dot = (fixed.exports as Record<string, Record<string, unknown>>)["."]!;
    const keys = Object.keys(dot);
    expect(keys[0]!).toBe("types");
  });

  it("non-fixable results are skipped", () => {
    const pkg = {
      name: "noop-pkg",
      version: "1.0.0",
      type: "module" as const,
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
      },
    };
    // Create fake non-fixable results
    const fakeResults = [
      {
        ruleId: "metadata/engines",
        severity: "warning" as const,
        message: "missing engines",
        category: "metadata",
        fixable: false as const,
        publint: null,
        attw: null,
      },
    ];
    const fixed = fixPackageJson(pkg, fakeResults);
    // Since the result is not fixable, the package should be unchanged (but cloned)
    expect(fixed).not.toBe(pkg);
    expect(fixed).toEqual(pkg);
  });

  it("returns modified package without mutating original", () => {
    const pkg = {
      name: "immutable-pkg",
      version: "1.0.0",
      exports: {
        ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
      },
    };
    const originalExports = JSON.parse(JSON.stringify(pkg.exports));
    const results = checkPackageJson(pkg);
    fixPackageJson(pkg, results);

    // Original should NOT be mutated
    expect(pkg.exports).toEqual(originalExports);
  });
});

describe("TOTAL_RULES and browserRules", () => {
  it("TOTAL_RULES matches expected count", () => {
    expect(TOTAL_RULES).toBe(70);
  });

  it("browserRules.length matches expected count", () => {
    expect(browserRules.length).toBe(39);
  });

  it("all browser rules have valid meta", () => {
    for (const rule of browserRules) {
      expect(rule.meta.id).toMatch(/^[a-z]+\/[a-z-]+$/);
      expect(typeof rule.meta.description).toBe("string");
      expect(["error", "warning", "info"]).toContain(rule.meta.defaultSeverity);
      expect([false, "safe", "unsafe"]).toContain(rule.meta.fixable);
    }
  });
});
