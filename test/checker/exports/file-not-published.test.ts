import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileNotPublishedRule } from "../../../src/checker/rules/exports/file-not-published.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-file-not-published");

beforeEach(async () => {
  await mkdir(join(tmpDir, "dist"), { recursive: true });
  await writeFile(join(tmpDir, "dist", "index.js"), "export {};\n");
  await writeFile(join(tmpDir, "dist", "index.d.ts"), "export {};\n");
});

afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

const baseCtx = { compilerOptions: null, hasBuildOutput: true, distFiles: [], allJsFiles: [], hasUnresolvedExtends: false };

describe("exports/file-not-published", () => {
  it("errors when file not in files field", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { files: ["src"], exports: { ".": "./dist/index.js" } },
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].message).toContain("not included");
  });

  it("passes when file matches files field", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx, dir: tmpDir,
      pkg: { files: ["dist"], exports: { ".": "./dist/index.js" } },
    });
    expect(results).toHaveLength(0);
  });

  it("skips when no build output", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx, dir: tmpDir, hasBuildOutput: false,
      pkg: { files: ["src"], exports: { ".": "./dist/index.js" } },
    });
    expect(results).toHaveLength(0);
  });
});
