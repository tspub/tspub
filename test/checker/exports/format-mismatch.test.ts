import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { formatMismatchRule } from "../../../src/checker/rules/exports/format-mismatch.js";

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), "tspub-test-format-mismatch-" + Date.now());
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

describe("exports/format-mismatch check", () => {
  it("returns empty when hasBuildOutput is false", async () => {
    const results = await formatMismatchRule.check({
      ...baseCtx,
      hasBuildOutput: false,
      dir: testDir,
      pkg: {
        exports: { ".": { import: "./dist/index.js" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("returns empty when no exports field", async () => {
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {},
    });
    expect(results).toHaveLength(0);
  });

  it("skips non-JS file extensions", async () => {
    await writeFile(join(testDir, "dist", "index.d.ts"), "export {};");
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { types: "./dist/index.d.ts" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("skips when file does not exist (readFileSafe returns null)", async () => {
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { import: "./dist/nonexistent.js" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("skips when content format is unknown", async () => {
    await writeFile(join(testDir, "dist", "index.js"), "// just a comment\n");
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { import: "./dist/index.js" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("warns when import condition has CJS content", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'const x = require("foo"); module.exports = x;',
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        type: "module",
        exports: { ".": { import: "./dist/index.js" } },
      },
    });
    expect(results.some((d) => d.message.includes("CJS syntax, expected ESM")))
      .toBe(true);
  });

  it("warns when require condition has ESM content", async () => {
    await writeFile(
      join(testDir, "dist", "index.cjs"),
      "export const x = 42; export default x;",
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { require: "./dist/index.cjs" } },
      },
    });
    expect(results.some((d) => d.message.includes("ESM syntax, expected CJS")))
      .toBe(true);
  });

  it("warns when extension-based format does not match content", async () => {
    // .mjs file with CJS content: condition is not import/require, so it checks extension
    await writeFile(
      join(testDir, "dist", "index.mjs"),
      'const x = require("foo"); module.exports = x;',
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { default: "./dist/index.mjs" } },
      },
    });
    expect(
      results.some((d) => d.message.includes("expected ESM")),
    ).toBe(true);
  });

  it("warns when .cjs file contains ESM content under default condition", async () => {
    await writeFile(
      join(testDir, "dist", "index.cjs"),
      "export const x = 42;",
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { default: "./dist/index.cjs" } },
      },
    });
    expect(
      results.some((d) => d.message.includes("expected CJS")),
    ).toBe(true);
  });

  it("does not warn on mixed content for extension check", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'const x = require("foo"); export default x;',
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        // Not using import/require condition, will use extension check
        exports: { ".": { default: "./dist/index.js" } },
      },
    });
    // Mixed content is not flagged for extension-based check
    expect(results).toHaveLength(0);
  });

  it("skips duplicate file checks", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'const x = require("foo"); module.exports = x;',
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: {
          ".": { import: "./dist/index.js" },
          "./alias": { import: "./dist/index.js" },
        },
      },
    });
    // Should only report once for the same file
    expect(
      results.filter((d) => d.message.includes("CJS syntax")).length,
    ).toBe(1);
  });

  it("passes when formats match correctly", async () => {
    await writeFile(join(testDir, "dist", "index.js"), "export const x = 42;");
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        type: "module",
        exports: { ".": { import: "./dist/index.js" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("warns when module field points to CJS content", async () => {
    await writeFile(
      join(testDir, "dist", "esm.js"),
      'const x = require("foo"); module.exports = x;',
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        module: "./dist/esm.js",
        exports: { ".": "./dist/something.js" },
      },
    });
    expect(
      results.some((d) =>
        d.message.includes('"module" field') && d.message.includes("CJS syntax"),
      ),
    ).toBe(true);
  });

  it("does not warn when module field has ESM content", async () => {
    await writeFile(
      join(testDir, "dist", "esm.js"),
      "export const x = 42;",
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        module: "./dist/esm.js",
        exports: { ".": "./dist/something.js" },
      },
    });
    expect(
      results.some((d) => d.message.includes('"module" field')),
    ).toBe(false);
  });

  it("does not check module field when it does not exist", async () => {
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { import: "./dist/nonexistent.js" } },
      },
    });
    expect(
      results.some((d) => d.message.includes('"module" field')),
    ).toBe(false);
  });

  it("handles module field pointing to nonexistent file", async () => {
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        module: "./dist/nonexistent.js",
        exports: { ".": "./dist/something.js" },
      },
    });
    // readFileSafe returns null for nonexistent file, so no diagnostic
    expect(
      results.some((d) => d.message.includes('"module" field')),
    ).toBe(false);
  });

  it("checks .mjs files in exports", async () => {
    await writeFile(join(testDir, "dist", "index.mjs"), "export const x = 1;");
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { import: "./dist/index.mjs" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("checks .cjs files in exports", async () => {
    await writeFile(
      join(testDir, "dist", "index.cjs"),
      "module.exports = {};",
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { require: "./dist/index.cjs" } },
      },
    });
    expect(results).toHaveLength(0);
  });

  it("condition check takes priority over extension check", async () => {
    // import condition with CJS content should report "import" mismatch
    // not extension-based mismatch
    await writeFile(
      join(testDir, "dist", "index.js"),
      'const x = require("foo"); module.exports = x;',
    );
    const results = await formatMismatchRule.check({
      ...baseCtx,
      dir: testDir,
      pkg: {
        exports: { ".": { import: "./dist/index.js" } },
      },
    });
    expect(results.length).toBe(1);
    expect(results[0]!.message).toContain("CJS syntax, expected ESM");
    // Should not also report extension mismatch
  });
});
