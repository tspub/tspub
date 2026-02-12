import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { cjsEsmoduleInteropRule } from "../../../src/checker/rules/exports/cjs-esmodule-interop.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-cjs-esmodule");

beforeEach(async () => { await mkdir(join(tmpDir, "dist"), { recursive: true }); });
afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

const baseCtx = { compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/cjs-esmodule-interop", () => {
  it("warns on __esModule pattern", async () => {
    await writeFile(join(tmpDir, "dist", "index.cjs"), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = function() {};\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { require: "./dist/index.cjs" } } },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("__esModule");
  });

  it("passes on clean CJS", async () => {
    await writeFile(join(tmpDir, "dist", "index.cjs"), 'module.exports = { hello: "world" };\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { require: "./dist/index.cjs" } } },
    });
    expect(results).toHaveLength(0);
  });

  it("skips ESM files", async () => {
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { import: "./dist/index.js" } } },
    });
    expect(results).toHaveLength(0);
  });
});
