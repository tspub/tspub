import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { declarationCompletenessRule } from "../../src/checker/rules/types/declaration-completeness.js";
import { noAnyExportRule } from "../../src/checker/rules/types/no-any-export.js";
import { resolutionRule } from "../../src/checker/rules/types/resolution.js";
import type { CheckContext } from "../../src/checker/framework/types.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-types-new-test");

beforeEach(async () => {
  await mkdir(join(tmpDir, "dist"), { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

function makeCtx(overrides: Partial<CheckContext>): CheckContext {
  return {
    pkg: { name: "test", version: "1.0.0", type: "module" },
    dir: tmpDir,
    compilerOptions: null,
    hasBuildOutput: true,
    distFiles: [],
    allJsFiles: [],
    hasUnresolvedExtends: false,
    ...overrides,
  };
}

describe("types/declaration-completeness", () => {
  it("passes when all exports have .d.ts files", async () => {
    await writeFile(join(tmpDir, "dist", "index.js"), "export {}");
    await writeFile(join(tmpDir, "dist", "index.d.ts"), "export {}");

    const ctx = makeCtx({
      pkg: {
        name: "test",
        version: "1.0.0",
        type: "module",
        exports: {
          ".": { import: { types: "./dist/index.d.ts", default: "./dist/index.js" } },
        },
      },
    });

    const results = await declarationCompletenessRule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it("warns when .d.ts is missing for a subpath", async () => {
    await writeFile(join(tmpDir, "dist", "utils.js"), "export {}");
    // No dist/utils.d.ts

    const ctx = makeCtx({
      pkg: {
        name: "test",
        version: "1.0.0",
        type: "module",
        exports: {
          ".": { import: "./dist/index.js" },
          "./utils": { import: "./dist/utils.js" },
        },
      },
    });

    const results = await declarationCompletenessRule.check(ctx);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.message.includes("utils"))).toBe(true);
  });
});

describe("types/no-any-export", () => {
  it("passes when few any types", async () => {
    await writeFile(
      join(tmpDir, "dist", "index.d.ts"),
      "export declare function foo(): string;\n",
    );

    const ctx = makeCtx({ distFiles: ["index.d.ts"] });
    const results = await noAnyExportRule.check(ctx);
    expect(results).toHaveLength(0);
  });

  it("warns when many any types in exports", async () => {
    const lines = Array.from(
      { length: 10 },
      (_, i) => `export declare function fn${i}(): any;`,
    ).join("\n");
    await writeFile(join(tmpDir, "dist", "bad.d.ts"), lines);

    const ctx = makeCtx({ distFiles: ["bad.d.ts"] });
    const results = await noAnyExportRule.check(ctx);
    expect(results).toHaveLength(1);
    expect(results[0]!.message).toContain("any");
  });
});

describe("types/resolution", () => {
  it("errors when JS condition has no types", async () => {
    const ctx = makeCtx({
      pkg: {
        name: "test",
        version: "1.0.0",
        type: "module",
        exports: {
          ".": { import: "./dist/index.js" },
        },
      },
    });

    const results = await resolutionRule.check(ctx);
    expect(results.some((r) => r.message.includes("no \"types\" condition"))).toBe(true);
  });

  it("detects format mismatch (CJS masquerading)", async () => {
    await writeFile(join(tmpDir, "dist", "index.d.ts"), "export {}");
    await writeFile(join(tmpDir, "dist", "index.js"), "export {}");

    const ctx = makeCtx({
      pkg: {
        name: "test",
        version: "1.0.0",
        type: "module",
        exports: {
          ".": {
            require: {
              types: "./dist/index.d.ts",
              default: "./dist/index.js",
            },
          },
        },
      },
    });

    const results = await resolutionRule.check(ctx);
    expect(results.some((r) => r.message.includes(".d.cts"))).toBe(true);
  });

  it("passes with correct types", async () => {
    await writeFile(join(tmpDir, "dist", "index.d.ts"), "export {}");
    await writeFile(join(tmpDir, "dist", "index.js"), "export {}");

    const ctx = makeCtx({
      pkg: {
        name: "test",
        version: "1.0.0",
        type: "module",
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

    const results = await resolutionRule.check(ctx);
    // Should not have format mismatch for import + type:module + .d.ts
    const formatErrors = results.filter((r) => r.message.includes("masquerading"));
    expect(formatErrors).toHaveLength(0);
  });
});
