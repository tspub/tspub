import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { buildContext } from "../../src/checker/framework/context.js";
import { filesFieldRule } from "../../src/checker/rules/files/files-field.js";
import { sensitiveRule } from "../../src/checker/rules/files/sensitive.js";
import { prepublishRule } from "../../src/checker/rules/files/prepublish.js";
import { duplicateDepRule } from "../../src/checker/rules/files/duplicate-dep.js";
import type { PackageJson } from "../../src/shared/package-json.js";

const fixturesDir = join(import.meta.dirname, "..", "fixtures");

async function checkFiles(pkg: PackageJson, dir: string) {
  const ctx = await buildContext(pkg, dir);
  const rules = [filesFieldRule, sensitiveRule, prepublishRule, duplicateDepRule];
  const results = [];
  for (const rule of rules) {
    const diags = await rule.check(ctx);
    results.push(...diags);
  }
  return results;
}

describe("checkFiles", () => {
  it("passes for valid ESM package", async () => {
    const pkg = {
      files: ["dist"],
      scripts: { prepublishOnly: "tspub build && tspub check" },
    };
    const results = await checkFiles(pkg, join(fixturesDir, "valid-esm"));
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("warns when files field is missing", async () => {
    const pkg = {};
    const results = await checkFiles(pkg, join(fixturesDir, "valid-esm"));
    expect(results.some((r) => r.message.includes('"files" field missing'))).toBe(
      true,
    );
  });

  it("warns when files includes src", async () => {
    const pkg = { files: ["dist", "src"] };
    const results = await checkFiles(pkg, join(fixturesDir, "valid-esm"));
    expect(
      results.some((r) => r.message.includes('includes "src/"')),
    ).toBe(true);
  });

  it("warns when prepublishOnly is missing", async () => {
    const pkg = { files: ["dist"], scripts: {} };
    const results = await checkFiles(pkg, join(fixturesDir, "valid-esm"));
    expect(
      results.some((r) => r.message.includes("prepublishOnly")),
    ).toBe(true);
  });
});
