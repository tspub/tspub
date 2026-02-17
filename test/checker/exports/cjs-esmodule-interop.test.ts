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

  it("skips ESM files (.mjs)", async () => {
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { import: "./dist/index.mjs" } } },
    });
    expect(results).toHaveLength(0);
  });

  it("warns on __esModule pattern in import condition", async () => {
    await writeFile(join(tmpDir, "dist", "index.js"), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = function() {};\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { import: "./dist/index.js" } } },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("__esModule");
    expect(results[0]!.message).toContain('exports["."].import');
  });

  it("warns on __esModule pattern in default condition", async () => {
    await writeFile(join(tmpDir, "dist", "index.js"), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = function() {};\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { default: "./dist/index.js" } } },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("__esModule");
    expect(results[0]!.message).toContain('exports["."].default');
  });

  it("deduplicates same file across conditions", async () => {
    await writeFile(join(tmpDir, "dist", "index.cjs"), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = function() {};\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { ".": { require: "./dist/index.cjs", default: "./dist/index.cjs" } } },
    });
    expect(results).toHaveLength(1);
  });

  it("includes subpath and condition in message", async () => {
    await writeFile(join(tmpDir, "dist", "react.cjs"), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = function() {};\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { "./react": { require: "./dist/react.cjs" } } },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain('exports["./react"].require');
  });

  it("checks main field when no exports", async () => {
    await writeFile(join(tmpDir, "dist", "index.js"), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = function() {};\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { main: "./dist/index.js" },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("__esModule");
    expect(results[0]!.message).toContain("(main)");
  });

  it("passes on clean main when no exports", async () => {
    await writeFile(join(tmpDir, "dist", "index.js"), 'module.exports = { hello: "world" };\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { main: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("expands glob patterns and checks matched files", async () => {
    await mkdir(join(tmpDir, "cjs"), { recursive: true });
    await writeFile(join(tmpDir, "cjs", "foo.js"), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = 1;\n');
    await writeFile(join(tmpDir, "cjs", "bar.js"), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = 2;\n');
    await writeFile(join(tmpDir, "cjs", "clean.js"), 'module.exports = {};\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { "./cjs/*": { require: "./cjs/*.js" } } },
    });
    expect(results).toHaveLength(2);
    expect(results.every(r => r.message!.includes("__esModule"))).toBe(true);
  });

  it("deduplicates glob-expanded files", async () => {
    await mkdir(join(tmpDir, "lib"), { recursive: true });
    await writeFile(join(tmpDir, "lib", "a.js"), 'Object.defineProperty(exports, "__esModule", { value: true });\nexports.default = 1;\n');
    const results = await cjsEsmoduleInteropRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { "./lib/*": { require: "./lib/*.js", default: "./lib/*.js" } } },
    });
    expect(results).toHaveLength(1);
  });
});
