import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { check } from "../../src/checker/index.js";
import type { CheckOptions } from "../../src/checker/index.js";
import { readPackageJson, writePackageJson } from "../../src/shared/package-json.js";
import { mkdir, rm, cp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("check --fix", () => {
  const testDir = join(tmpdir(), "tspub-test-fixer-" + Date.now());
  const fixtureDir = join(import.meta.dirname, "..", "fixtures", "missing-fields");

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    await cp(fixtureDir, testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("adds type: module when missing but ESM exports present", async () => {
    // First add ESM exports so the type: module check triggers as an error
    const pkg = await readPackageJson(testDir);
    pkg.exports = { ".": { import: { types: "./dist/index.d.ts", default: "./dist/index.js" } } };
    await writePackageJson(testDir, pkg);

    const results = await check({ dir: testDir, fix: true, strict: false });
    const fixed = await readPackageJson(testDir);
    expect(fixed.type).toBe("module");
    expect(results.some((r) => r.message.includes("Fixed:"))).toBe(true);
  });

  it("--fix without --unsafe skips unsafe rules", async () => {
    const results = await check({ dir: testDir, fix: true, strict: false });
    const fixed = await readPackageJson(testDir);
    // exports-field is unsafe, should NOT be added
    expect(fixed.exports).toBeUndefined();
    // Should show skippable fix hint
    expect(results.some((r) => r.message.includes("Skippable fix (use --unsafe)"))).toBe(true);
  });

  it("--fix --unsafe applies unsafe rules", async () => {
    await writeFile(join(testDir, "LICENSE"), "MIT License\n\nCopyright ...", "utf-8");
    const results = await check({ dir: testDir, fix: true, unsafe: true, strict: false });
    const fixed = await readPackageJson(testDir);
    // exports-field is unsafe but --unsafe is set, should be added
    expect(fixed.exports).toBeDefined();
    expect((fixed.exports as Record<string, unknown>)["."]).toBeDefined();
    // engines should be added
    expect(fixed.engines).toBeDefined();
    // license should be inferred from LICENSE file
    expect(fixed.license).toBe("MIT");
    expect(results.some((r) => r.message.includes("Fixed:"))).toBe(true);
  });

  it("adds files field when missing (safe fix)", async () => {
    await check({ dir: testDir, fix: true, strict: false });
    const pkg = await readPackageJson(testDir);
    expect(pkg.files).toEqual(["dist"]);
  });

  it("does not add sideEffects (no longer fixable)", async () => {
    await check({ dir: testDir, fix: true, unsafe: true, strict: false });
    const pkg = await readPackageJson(testDir);
    expect(pkg.sideEffects).toBeUndefined();
  });

  it("adds engines field when missing (unsafe)", async () => {
    await check({ dir: testDir, fix: true, unsafe: true, strict: false });
    const pkg = await readPackageJson(testDir);
    expect(pkg.engines).toBeDefined();
  });

  it("does not overwrite existing engines", async () => {
    const pkg = await readPackageJson(testDir);
    pkg.engines = { node: ">=20.0.0" };
    await writePackageJson(testDir, pkg);

    await check({ dir: testDir, fix: true, unsafe: true, strict: false });
    const fixed = await readPackageJson(testDir);
    expect(fixed.engines).toEqual({ node: ">=20.0.0" });
  });

  it("adds prepublishOnly script when missing (safe fix)", async () => {
    await check({ dir: testDir, fix: true, strict: false });
    const pkg = await readPackageJson(testDir);
    expect(pkg.scripts?.["prepublishOnly"]).toBeDefined();
  });

  it("removes test directory from files (safe fix)", async () => {
    const pkg = await readPackageJson(testDir);
    pkg.files = ["dist", "test"];
    await writePackageJson(testDir, pkg);

    await check({ dir: testDir, fix: true, strict: false });
    const fixed = await readPackageJson(testDir);
    expect(fixed.files).not.toContain("test");
  });

  it("adds dot entry to exports when missing (unsafe)", async () => {
    const pkg = await readPackageJson(testDir);
    pkg.type = "module";
    pkg.exports = { "./utils": "./dist/utils.js" };
    await writePackageJson(testDir, pkg);

    await check({ dir: testDir, fix: true, unsafe: true, strict: false });
    const fixed = await readPackageJson(testDir);
    const exports = fixed.exports as Record<string, unknown>;
    expect(exports["."]).toBeDefined();
    expect(exports["./utils"]).toBe("./dist/utils.js");
  });

  it("adds import condition when missing from exports (unsafe)", async () => {
    const pkg = await readPackageJson(testDir);
    pkg.type = "module";
    pkg.exports = { ".": { require: "./dist/index.cjs" } };
    await writePackageJson(testDir, pkg);

    await check({ dir: testDir, fix: true, unsafe: true, strict: false });
    const fixed = await readPackageJson(testDir);
    const dot = (fixed.exports as Record<string, Record<string, unknown>>)["."];
    expect(dot["import"]).toBeDefined();
    expect(dot["require"]).toBe("./dist/index.cjs");
  });

  it("reorders flat condition map types before default (safe)", async () => {
    const pkg = await readPackageJson(testDir);
    pkg.type = "module";
    pkg.exports = {
      ".": {
        import: "./dist/index.js",
        types: "./dist/index.d.ts",
      },
    };
    await writePackageJson(testDir, pkg);

    await check({ dir: testDir, fix: true, strict: false });
    const fixed = await readPackageJson(testDir);
    const dot = (fixed.exports as Record<string, Record<string, string>>)["."];
    const keys = Object.keys(dot);
    expect(keys.indexOf("types")).toBeLessThan(keys.indexOf("import"));
  });

  it("reorders types before default in exports (safe)", async () => {
    const pkg = await readPackageJson(testDir);
    pkg.type = "module";
    pkg.exports = {
      ".": {
        import: {
          default: "./dist/index.js",
          types: "./dist/index.d.ts",
        },
      },
    };
    await writePackageJson(testDir, pkg);

    await check({ dir: testDir, fix: true, strict: false });
    const fixed = await readPackageJson(testDir);
    const importCond = (fixed.exports as Record<string, Record<string, Record<string, string>>>)["."]["import"];
    const keys = Object.keys(importCond);
    expect(keys.indexOf("types")).toBeLessThan(keys.indexOf("default"));
  });

  it("license reads from LICENSE file", async () => {
    await writeFile(join(testDir, "LICENSE"), "MIT License\n\nCopyright (c) 2024", "utf-8");
    await check({ dir: testDir, fix: true, unsafe: true, strict: false });
    const pkg = await readPackageJson(testDir);
    expect(pkg.license).toBe("MIT");
  });

  it("license does not fix when no LICENSE file", async () => {
    await check({ dir: testDir, fix: true, unsafe: true, strict: false });
    const pkg = await readPackageJson(testDir);
    expect(pkg.license).toBeUndefined();
  });

  it("--fix-dry-run returns Would fix messages without modifying package.json", async () => {
    const pkgBefore = await readPackageJson(testDir);
    const filesBefore = pkgBefore.files;

    const results = await check({ dir: testDir, fix: true, dryRun: true, strict: false });
    const pkgAfter = await readPackageJson(testDir);

    // Should have "Would fix:" messages
    expect(results.some((r) => r.message.includes("Would fix:"))).toBe(true);
    expect(results.some((r) => r.message.includes("Fixed:"))).toBe(false);
    // Package.json should NOT be modified
    expect(pkgAfter.files).toEqual(filesBefore);
  });

  it("--fix-dry-run with --unsafe shows would-fix messages for unsafe rules", async () => {
    const results = await check({ dir: testDir, fix: true, dryRun: true, unsafe: true, strict: false });
    expect(results.some((r) => r.message.includes("Would fix:"))).toBe(true);
    // Should not have modified pkg
    const pkg = await readPackageJson(testDir);
    expect(pkg.exports).toBeUndefined();
  });

  it("--fix-type files only applies files-category fixes", async () => {
    await writeFile(join(testDir, "LICENSE"), "MIT License\n\nCopyright ...", "utf-8");
    const results = await check({ dir: testDir, fix: true, unsafe: true, fixTypes: ["files"], strict: false });
    const pkg = await readPackageJson(testDir);

    // files-category fixes should be applied (e.g. files field, prepublish)
    expect(pkg.files).toBeDefined();
    // exports-category should NOT be applied
    expect(pkg.exports).toBeUndefined();
    // metadata-category should NOT be applied (license)
    expect(pkg.license).toBeUndefined();
  });

  it("--fix-type exports,metadata applies both categories", async () => {
    await writeFile(join(testDir, "LICENSE"), "MIT License\n\nCopyright ...", "utf-8");
    const results = await check({ dir: testDir, fix: true, unsafe: true, fixTypes: ["exports", "metadata"], strict: false });
    const pkg = await readPackageJson(testDir);

    // exports should be applied
    expect(pkg.exports).toBeDefined();
    // metadata should be applied (license, engines)
    expect(pkg.license).toBe("MIT");
    // files-category should NOT be applied
    expect(pkg.files).toBeUndefined();
  });

  it("exports-field infers paths from distFiles", async () => {
    // Create dist with specific files
    await mkdir(join(testDir, "dist"), { recursive: true });
    await writeFile(join(testDir, "dist", "index.mjs"), "export default 1;", "utf-8");
    await writeFile(join(testDir, "dist", "index.d.mts"), "", "utf-8");

    const pkg = await readPackageJson(testDir);
    pkg.type = "module";
    await writePackageJson(testDir, pkg);

    await check({ dir: testDir, fix: true, unsafe: true, strict: false });
    const fixed = await readPackageJson(testDir);
    expect(fixed.exports).toBeDefined();
    const dot = (fixed.exports as Record<string, Record<string, Record<string, string>>>)["."];
    // Should have inferred paths from distFiles
    expect(dot.import.default).toBe("./dist/index.mjs");
    expect(dot.import.types).toBe("./dist/index.d.mts");
  });
});
