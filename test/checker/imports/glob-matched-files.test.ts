import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { importsGlobMatchedFilesRule } from "../../../src/checker/rules/imports/glob-matched-files.js";
import type { CheckContext } from "../../../src/checker/framework/types.js";
import type { PackageJson } from "../../../src/shared/package-json.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), "tspub-test-glob-matched-" + Date.now());
  await mkdir(join(testDir, "src"), { recursive: true });
  await mkdir(join(testDir, "dist"), { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

function makeCtx(pkg: PackageJson, overrides?: Partial<CheckContext>): CheckContext {
  return {
    pkg,
    dir: testDir,
    compilerOptions: null,
    hasBuildOutput: true,
    distFiles: [],
    allJsFiles: [],
    hasUnresolvedExtends: false,
    ...overrides,
  };
}

describe("imports/glob-matched-files", () => {
  it("has correct metadata", () => {
    expect(importsGlobMatchedFilesRule.meta.id).toBe("imports/glob-matched-files");
    expect(importsGlobMatchedFilesRule.meta.category).toBe("imports");
    expect(importsGlobMatchedFilesRule.meta.defaultSeverity).toBe("warning");
    expect(importsGlobMatchedFilesRule.meta.fixable).toBe(false);
  });

  it("is not fixable", () => {
    expect(importsGlobMatchedFilesRule.fix).toBeUndefined();
  });

  // ---- Early returns ----

  it("returns empty when hasBuildOutput is false", async () => {
    const pkg: PackageJson = {
      imports: { "#internal/*": "./src/*.js" },
    };
    const diags = await importsGlobMatchedFilesRule.check(
      makeCtx(pkg, { hasBuildOutput: false }),
    );
    expect(diags).toHaveLength(0);
  });

  it("returns empty when no imports field", async () => {
    const diags = await importsGlobMatchedFilesRule.check(makeCtx({}));
    expect(diags).toHaveLength(0);
  });

  it("returns empty when imports is undefined", async () => {
    const pkg: PackageJson = {};
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Skips non-./ paths ----

  it("skips entries whose value does not start with ./", async () => {
    const pkg: PackageJson = {
      imports: { "#internal/*": "src/*.js" },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Skips non-glob patterns ----

  it("skips entries without wildcard (*) in value", async () => {
    const pkg: PackageJson = {
      imports: { "#utils": "./src/utils.js" },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Glob matches files ----

  it("returns empty when wildcard pattern matches files", async () => {
    await writeFile(join(testDir, "src", "a.js"), "export const a = 1;");
    await writeFile(join(testDir, "src", "b.js"), "export const b = 2;");
    const pkg: PackageJson = {
      imports: { "#internal/*": { import: "./src/*.js" } },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Glob matches no files ----

  it("warns when wildcard pattern does not match any files", async () => {
    const pkg: PackageJson = {
      imports: { "#internal/*": { import: "./nonexistent/*.js" } },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.severity).toBe("warning");
    expect(diags[0]!.message).toContain("#internal/*");
    expect(diags[0]!.message).toContain("does not match any files");
    expect(diags[0]!.message).toContain("./nonexistent/*.js");
  });

  it("warns for each unmatched pattern across different keys", async () => {
    const pkg: PackageJson = {
      imports: {
        "#a/*": { import: "./missing-a/*.js" },
        "#b/*": { import: "./missing-b/*.js" },
      },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(2);
    expect(diags[0]!.message).toContain("#a/*");
    expect(diags[1]!.message).toContain("#b/*");
  });

  // ---- Deduplication ----

  it("only checks the same glob pattern once (deduplicates)", async () => {
    // Two different keys with the same glob value
    const pkg: PackageJson = {
      imports: {
        "#a/*": { import: "./missing/*.js" },
        "#b/*": { import: "./missing/*.js" },
      },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    // Only 1 warning because the pattern ./missing/*.js is only checked once
    expect(diags).toHaveLength(1);
    expect(diags[0]!.message).toContain("does not match any files");
  });

  it("checks duplicate patterns only once even when they match", async () => {
    await writeFile(join(testDir, "src", "x.js"), "export const x = 1;");
    const pkg: PackageJson = {
      imports: {
        "#a/*": { import: "./src/*.js" },
        "#b/*": { import: "./src/*.js" },
      },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Nested conditions ----

  it("checks glob patterns in nested conditions", async () => {
    const pkg: PackageJson = {
      imports: {
        "#internal/*": {
          node: { import: "./nonexistent/*.mjs" },
        },
      },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.message).toContain("does not match any files");
  });

  // ---- Mix of matching and non-matching patterns ----

  it("only warns for non-matching patterns when some match", async () => {
    await writeFile(join(testDir, "src", "a.js"), "export const a = 1;");
    const pkg: PackageJson = {
      imports: {
        "#found/*": { import: "./src/*.js" },
        "#missing/*": { import: "./no-such-dir/*.js" },
      },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.message).toContain("#missing/*");
  });

  // ---- String shorthand with glob ----

  it("checks string shorthand with glob pattern", async () => {
    const pkg: PackageJson = {
      imports: {
        "#internal/*": "./nonexistent/*.js",
      },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.message).toContain("does not match any files");
  });

  it("returns empty for string shorthand with matching glob", async () => {
    await writeFile(join(testDir, "src", "mod.js"), "export const mod = 1;");
    const pkg: PackageJson = {
      imports: {
        "#internal/*": "./src/*.js",
      },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(0);
  });

  // ---- Multiple conditions, one with glob, one without ----

  it("checks only glob values and ignores non-glob values in same entry", async () => {
    const pkg: PackageJson = {
      imports: {
        "#utils": { import: "./src/utils.js", module: "./missing/*.js" },
      },
    };
    const diags = await importsGlobMatchedFilesRule.check(makeCtx(pkg));
    expect(diags).toHaveLength(1);
    expect(diags[0]!.message).toContain("./missing/*.js");
  });
});
