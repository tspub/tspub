import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { buildContext } from "../../src/checker/framework/context.js";
import { typeModuleRule } from "../../src/checker/rules/exports/type-module.js";
import { exportsFieldRule } from "../../src/checker/rules/exports/exports-field.js";
import { dotEntryRule } from "../../src/checker/rules/exports/dot-entry.js";
import { typesOrderRule } from "../../src/checker/rules/exports/types-order.js";
import { importConditionRule } from "../../src/checker/rules/exports/import-condition.js";
import type { PackageJson } from "../../src/shared/package-json.js";
import type { CheckContext } from "../../src/checker/framework/types.js";

const fixturesDir = join(import.meta.dirname, "..", "fixtures");

async function checkExports(pkg: PackageJson, dir: string) {
  const ctx = await buildContext(pkg, dir);
  const rules = [typeModuleRule, exportsFieldRule, dotEntryRule, typesOrderRule, importConditionRule];
  const results = [];
  for (const rule of rules) {
    const diags = await rule.check(ctx);
    results.push(...diags.map((d) => ({ ...d, ruleId: rule.meta.id })));
  }
  return results;
}

describe("checkExports", () => {
  it("passes for valid ESM package", async () => {
    const pkg = {
      type: "module",
      exports: {
        ".": {
          import: {
            types: "./dist/index.d.ts",
            default: "./dist/index.js",
          },
        },
      },
    };
    const results = await checkExports(pkg, join(fixturesDir, "valid-esm"));
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("info when type: module is missing on non-ESM package", async () => {
    const pkg = {
      exports: {
        ".": {
          require: "./dist/index.cjs",
        },
      },
    };
    const results = await checkExports(pkg, fixturesDir);
    expect(results.some((r) => r.severity === "info" && r.message.includes('"type": "module"'))).toBe(true);
    expect(results.some((r) => r.severity === "error" && r.message.includes('"type": "module"'))).toBe(false);
  });

  it("errors when type: module missing but exports use ESM", async () => {
    const pkg = {
      exports: {
        ".": {
          import: {
            types: "./dist/index.d.ts",
            default: "./dist/index.js",
          },
        },
      },
    };
    const results = await checkExports(pkg, join(fixturesDir, "valid-esm"));
    expect(results.some((r) => r.severity === "error" && r.message.includes('"type": "module"'))).toBe(true);
  });

  it("errors when exports field is missing entirely", async () => {
    const pkg = { type: "module" };
    const results = await checkExports(pkg, fixturesDir);
    expect(results.some((r) => r.message.includes('"exports"'))).toBe(true);
  });

  it("info instead of error when exports missing but main exists", async () => {
    const pkg = { type: "module", main: "./dist/index.js" };
    const results = await checkExports(pkg, fixturesDir);
    expect(results.some((r) => r.severity === "info" && r.message.includes('"exports"'))).toBe(true);
  });

  it("errors when types comes after default", async () => {
    const pkg = {
      type: "module",
      exports: {
        ".": {
          import: {
            default: "./dist/index.js",
            types: "./dist/index.d.ts",
          },
        },
      },
    };
    const results = await checkExports(pkg, join(fixturesDir, "valid-esm"));
    expect(
      results.some((r) => r.message.includes("types should come BEFORE")),
    ).toBe(true);
  });

  it("accepts flat condition map (types + import + require at top level)", async () => {
    const pkg = {
      type: "module",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
          require: "./dist/index.cjs",
        },
      },
    };
    const results = await checkExports(pkg, fixturesDir);
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("accepts string shorthand exports", async () => {
    const pkg = {
      type: "module",
      exports: {
        ".": "./dist/index.js",
      },
    };
    const results = await checkExports(pkg, fixturesDir);
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("accepts subpath-only exports without .", async () => {
    const pkg = {
      type: "module",
      exports: {
        "./utils": "./dist/utils.js",
        "./core": "./dist/core.js",
      },
    };
    const results = await checkExports(pkg, fixturesDir);
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
    expect(results.some((r) => r.severity === "info" && r.message.includes("subpath"))).toBe(true);
  });
});
