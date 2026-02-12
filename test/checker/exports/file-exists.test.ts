import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileExistsRule } from "../../../src/checker/rules/exports/file-exists.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), "tspub-test-file-exists-" + Date.now());
  await mkdir(join(testDir, "dist"), { recursive: true });
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

describe("exports/file-exists check", () => {
  it("returns empty when hasBuildOutput is false", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: testDir,
      pkg: {
        exports: { ".": { import: "./dist/missing.js" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when no exports field", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when exports is a string", async () => {
    await writeFile(join(testDir, "dist", "index.js"), "export {};");
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: { exports: "./dist/index.js" },
    });
    // String exports are not checked by this rule (typeof check)
    expect(results).toHaveLength(0);
  });

  it("warns for missing file in subpath map", async () => {
    await writeFile(join(testDir, "dist", "other.js"), "export {};");
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": "./dist/nonexistent.js",
        },
      },
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.message).toContain("doesn't exist");
  });

  it("passes when subpath string file exists", async () => {
    await writeFile(join(testDir, "dist", "index.js"), "export {};");
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": "./dist/index.js",
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("warns for missing file in nested condition map", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": {
            import: {
              types: "./dist/missing.d.ts",
              default: "./dist/missing.js",
            },
          },
        },
      },
    });
    expect(results.length).toBe(2);
    expect(results[0]!.message).toContain("not found");
    expect(results[1]!.message).toContain("not found");
  });

  it("passes when nested condition files exist", async () => {
    await writeFile(join(testDir, "dist", "index.js"), "export {};");
    await writeFile(
      join(testDir, "dist", "index.d.ts"),
      "export declare const x: number;",
    );
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
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
    expect(results).toHaveLength(0);
  });

  it("handles top-level condition map (no subpath keys)", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          import: "./dist/missing.js",
          require: "./dist/missing.cjs",
        },
      },
    });
    // Both files are missing, each should get a diagnostic
    expect(results.length).toBe(2);
    results.forEach((r) => expect(r.message).toContain("not found"));
  });

  it("passes top-level condition map when files exist", async () => {
    await writeFile(join(testDir, "dist", "index.js"), "export {};");
    await writeFile(
      join(testDir, "dist", "index.cjs"),
      "module.exports = {};",
    );
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          import: "./dist/index.js",
          require: "./dist/index.cjs",
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("warns when main field points to missing file", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: { main: "./dist/nonexistent.js" },
    });
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('"main"');
    expect(results[0]!.message).toContain("doesn't exist");
  });

  it("passes when main field points to existing file", async () => {
    await writeFile(join(testDir, "dist", "index.js"), "export {};");
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: { main: "./dist/index.js" },
    });
    expect(results).toHaveLength(0);
  });

  it("warns when module field points to missing file", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: { module: "./dist/nonexistent.mjs" },
    });
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('"module"');
    expect(results[0]!.message).toContain("doesn't exist");
  });

  it("passes when module field points to existing file", async () => {
    await writeFile(join(testDir, "dist", "index.mjs"), "export {};");
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: { module: "./dist/index.mjs" },
    });
    expect(results).toHaveLength(0);
  });

  it("warns when types field points to missing file", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: { types: "./dist/nonexistent.d.ts" },
    });
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain('"types"');
    expect(results[0]!.message).toContain("doesn't exist");
  });

  it("passes when types field points to existing file", async () => {
    await writeFile(
      join(testDir, "dist", "index.d.ts"),
      "export declare const x: number;",
    );
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: { types: "./dist/index.d.ts" },
    });
    expect(results).toHaveLength(0);
  });

  it("reports all three missing fields at once", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        main: "./dist/main.js",
        module: "./dist/module.mjs",
        types: "./dist/types.d.ts",
      },
    });
    expect(results.length).toBe(3);
    expect(results.some((r) => r.message.includes('"main"'))).toBe(true);
    expect(results.some((r) => r.message.includes('"module"'))).toBe(true);
    expect(results.some((r) => r.message.includes('"types"'))).toBe(true);
  });

  it("skips non-condition keys in checkConditionMap", async () => {
    // Keys that are not in the recognized list should be skipped
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": {
            "custom-condition": "./dist/custom.js",
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("handles array values gracefully (skipped by checkConditionMap)", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": {
            import: ["./dist/a.js", "./dist/b.js"],
          },
        },
      },
    });
    // Array values are filtered by the type checks in checkConditionMap
    expect(results).toHaveLength(0);
  });

  it("handles null value in condition map", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": {
            import: null,
          },
        },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("checks multiple subpaths", async () => {
    await writeFile(join(testDir, "dist", "index.js"), "export {};");
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": "./dist/index.js",
          "./utils": "./dist/utils.js",
        },
      },
    });
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("utils.js");
  });

  it("checks browser and node conditions", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": {
            browser: "./dist/browser.js",
            node: "./dist/node.js",
          },
        },
      },
    });
    expect(results.length).toBe(2);
    expect(results.some((r) => r.message.includes("browser"))).toBe(true);
    expect(results.some((r) => r.message.includes("node"))).toBe(true);
  });

  it("checks module condition", async () => {
    const results = await fileExistsRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": {
            module: "./dist/module.js",
          },
        },
      },
    });
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("module");
  });
});
