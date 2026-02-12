import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { cjsDefaultExportRule } from "../../../src/checker/rules/exports/cjs-default-export.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-cjs-default");

beforeEach(async () => { await mkdir(join(tmpDir, "dist"), { recursive: true }); });
afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

const baseCtx = { compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/cjs-default-export", () => {
  it("reports CJS with only default export", async () => {
    await writeFile(join(tmpDir, "dist", "index.cjs"), 'module.exports = function hello() {};\n');
    const results = await cjsDefaultExportRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { require: "./dist/index.cjs" } } },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.severity).toBe("info");
  });

  it("passes CJS with named exports", async () => {
    await writeFile(join(tmpDir, "dist", "index.cjs"), 'module.exports = {};\nexports.hello = function() {};\n');
    const results = await cjsDefaultExportRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { require: "./dist/index.cjs" } } },
    });
    expect(results).toHaveLength(0);
  });

  it("skips when import condition exists", async () => {
    await writeFile(join(tmpDir, "dist", "index.cjs"), 'module.exports = function() {};\n');
    const results = await cjsDefaultExportRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { import: "./dist/index.js", require: "./dist/index.cjs" } } },
    });
    expect(results).toHaveLength(0);
  });
});
