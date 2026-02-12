import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileNotPublishedRule } from "../../../src/checker/rules/exports/file-not-published.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), "tspub-test-fnp-" + Date.now());
  await mkdir(join(testDir, "dist"), { recursive: true });
  await writeFile(join(testDir, "dist", "index.js"), "export {};\n");
  await writeFile(join(testDir, "dist", "index.d.ts"), "export {};\n");
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

const baseCtx = {
  compilerOptions: null,
  hasBuildOutput: true,
  distFiles: [],
  allJsFiles: [],
  hasUnresolvedExtends: false,
};

describe("exports/file-not-published check (extended)", () => {
  it("returns empty when hasBuildOutput is false", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: testDir,
      pkg: {
        files: ["src"],
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when no referenced files", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });

  it("errors when exports file not in files field", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.message).toContain("not included");
    expect(results[0]!.message).toContain("won't be published");
  });

  it("passes when exports file matches files field", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["dist"],
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when files field includes with glob suffix", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["dist/**"],
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when files field includes with single glob", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["dist/*"],
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("errors when main is not in files field", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        main: "./dist/index.js",
      },
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.message).toContain("not included");
  });

  it("errors when module is not in files field", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        module: "./dist/index.js",
      },
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.message).toContain("not included");
  });

  it("errors when types is not in files field", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        types: "./dist/index.d.ts",
      },
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.message).toContain("not included");
  });

  it("errors when bin (string) is not in files field", async () => {
    await writeFile(join(testDir, "dist", "cli.js"), "#!/usr/bin/env node\n");
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        bin: "./dist/cli.js",
      },
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.message).toContain("not included");
  });

  it("errors when bin (object) values are not in files field", async () => {
    await writeFile(join(testDir, "dist", "cli.js"), "#!/usr/bin/env node\n");
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        bin: { mytool: "./dist/cli.js" },
      },
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.message).toContain("not included");
  });

  it("skips always-included files (package.json, README, LICENSE)", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        main: "./README.md",
      },
    });
    // README is always included
    expect(results).toHaveLength(0);
  });

  it("skips LICENSE variant", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        main: "./LICENCE",
      },
    });
    expect(results).toHaveLength(0);
  });

  it("skips CHANGELOG variant", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        main: "./CHANGELOG.md",
      },
    });
    expect(results).toHaveLength(0);
  });

  it("passes when no files field (all files published)", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("collects files from nested exports conditions", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        exports: {
          ".": {
            import: {
              types: "./dist/index.d.ts",
              default: "./dist/index.js",
            },
          },
        },
      },
    });
    // Both ./dist/index.d.ts and ./dist/index.js should be flagged
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("deduplicates referenced files", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        main: "./dist/index.js",
        exports: { ".": "./dist/index.js" },
      },
    });
    // ./dist/index.js referenced in both main and exports, but should be deduped
    const msgs = results.filter((r) =>
      r.message.includes("dist/index.js"),
    );
    expect(msgs.length).toBe(1);
  });

  it("skips glob patterns in exports (with *)", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        exports: {
          "./*": "./dist/*.js",
        },
      },
    });
    // Glob pattern entries are skipped by collectReferencedFiles
    expect(results).toHaveLength(0);
  });

  it("handles .npmignore patterns", async () => {
    await writeFile(join(testDir, ".npmignore"), "dist/index.js\n");
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": "./dist/index.js" },
      },
    });
    // The .npmignore file matches the referenced file
    expect(
      results.some((r) => r.message.includes(".npmignore")),
    ).toBe(true);
  });

  it("ignores comments in .npmignore", async () => {
    await writeFile(
      join(testDir, ".npmignore"),
      "# comment\n\nsrc/\n",
    );
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": "./dist/index.js" },
      },
    });
    // dist/index.js is not in .npmignore exclusions
    expect(results).toHaveLength(0);
  });

  it("handles files field with ./ prefix", async () => {
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["./dist"],
        exports: { ".": "./dist/index.js" },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("handles multiple exports subpaths", async () => {
    await writeFile(join(testDir, "dist", "utils.js"), "export {};");
    const results = await fileNotPublishedRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        files: ["src"],
        exports: {
          ".": "./dist/index.js",
          "./utils": "./dist/utils.js",
        },
      },
    });
    // Both files should be flagged
    expect(results.length).toBeGreaterThanOrEqual(2);
  });
});
