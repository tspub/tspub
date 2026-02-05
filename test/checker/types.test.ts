import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { buildContext } from "../../src/checker/framework/context.js";
import { tsconfigExistsRule } from "../../src/checker/rules/types/tsconfig-exists.js";
import { declarationRule } from "../../src/checker/rules/types/declaration.js";
import { strictRule } from "../../src/checker/rules/types/strict.js";
import { moduleRule } from "../../src/checker/rules/types/module.js";
import { moduleResolutionRule } from "../../src/checker/rules/types/module-resolution.js";
import { isolatedModulesRule } from "../../src/checker/rules/types/isolated-modules.js";
import type { PackageJson } from "../../src/shared/package-json.js";

const fixturesDir = join(import.meta.dirname, "..", "fixtures");

async function checkTypes(pkg: PackageJson, dir: string) {
  const ctx = await buildContext(pkg, dir);
  const rules = [tsconfigExistsRule, declarationRule, strictRule, moduleRule, moduleResolutionRule, isolatedModulesRule];
  const results = [];
  for (const rule of rules) {
    const diags = await rule.check(ctx);
    results.push(...diags);
  }
  return results;
}

describe("checkTypes", () => {
  it("passes for valid ESM package with correct tsconfig", async () => {
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
    const results = await checkTypes(pkg, join(fixturesDir, "valid-esm"));
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("warns when tsconfig is missing", async () => {
    const pkg = {};
    const results = await checkTypes(pkg, join(fixturesDir, "broken-exports"));
    expect(results.some((r) => r.message.includes("tsconfig.json not found"))).toBe(
      true,
    );
  });

  it("warns when tsconfig has wrong module settings", async () => {
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
    const results = await checkTypes(pkg, join(fixturesDir, "broken-types"));
    expect(
      results.some((r) => r.message.includes('"module" is "commonjs"')),
    ).toBe(true);
    expect(
      results.some((r) => r.message.includes('"moduleResolution" is "node"')),
    ).toBe(true);
    expect(
      results.some((r) => r.message.includes('"strict" should be true')),
    ).toBe(true);
    expect(
      results.some((r) => r.message.includes('"declaration" should be true')),
    ).toBe(true);
    expect(
      results.some((r) => r.message.includes('"isolatedModules" should be true')),
    ).toBe(true);
  });
});
