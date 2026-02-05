import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { globMatchedFilesRule } from "../../../src/checker/rules/exports/glob-matched-files.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-glob-matched");

beforeEach(async () => {
  await mkdir(join(tmpDir, "dist"), { recursive: true });
  await writeFile(join(tmpDir, "dist", "utils.js"), "export {};\n");
});

afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

const baseCtx = { compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/glob-matched-files", () => {
  it("passes when glob matches files", async () => {
    const results = await globMatchedFilesRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { "./dist/*": "./dist/*.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("warns when glob matches no files", async () => {
    const results = await globMatchedFilesRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { exports: { "./lib/*": "./lib/*.js" } },
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it("skips pre-build", async () => {
    const results = await globMatchedFilesRule.check({
      ...baseCtx, dir: tmpDir, hasBuildOutput: false,
      pkg: { exports: { "./lib/*": "./lib/*.js" } },
    });
    expect(results).toHaveLength(0);
  });
});
