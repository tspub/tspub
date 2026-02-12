import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { buildContext } from "../../src/checker/framework/context.js";
import { binShebangRule } from "../../src/checker/rules/files/bin-shebang.js";
import { allFilesFormatRule } from "../../src/checker/rules/files/all-files-format.js";
import type { PackageJson } from "../../src/shared/package-json.js";

describe("files/bin-shebang", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), "tspub-test-shebang-" + Date.now());
    await mkdir(join(testDir, "dist"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("warns when bin file missing shebang", async () => {
    await writeFile(join(testDir, "dist", "cli.js"), 'console.log("hello");');
    const pkg: PackageJson = {
      name: "my-tool",
      bin: { "my-tool": "./dist/cli.js" },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = await binShebangRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]!.message).toContain("missing a shebang");
  });

  it("passes when bin file has shebang", async () => {
    await writeFile(
      join(testDir, "dist", "cli.js"),
      '#!/usr/bin/env node\nconsole.log("hello");',
    );
    const pkg: PackageJson = {
      name: "my-tool",
      bin: { "my-tool": "./dist/cli.js" },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = await binShebangRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("skips when no build output", async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
    const pkg: PackageJson = { bin: { cli: "./dist/cli.js" } };
    const ctx = await buildContext(pkg, testDir);
    const diags = await binShebangRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("handles string bin field", async () => {
    await writeFile(join(testDir, "dist", "cli.js"), 'console.log("hello");');
    const pkg: PackageJson = { name: "my-tool", bin: "./dist/cli.js" };
    const ctx = await buildContext(pkg, testDir);
    const diags = await binShebangRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]!.message).toContain("my-tool");
  });
});

describe("files/all-files-format", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), "tspub-test-allformat-" + Date.now());
    await mkdir(join(testDir, "dist"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("warns when ESM file is interpreted as CJS (no exports)", async () => {
    // type is not "module" so .js is CJS, but file has ESM syntax
    await writeFile(
      join(testDir, "dist", "index.js"),
      'export const x = 42;',
    );
    const pkg: PackageJson = {}; // no exports, no type: module
    const ctx = await buildContext(pkg, testDir);
    const diags = await allFilesFormatRule.check(ctx);
    expect(diags.some((d) => d.message.includes("ESM") && d.message.includes("CJS"))).toBe(true);
  });

  it("skips when exports is defined", async () => {
    await writeFile(
      join(testDir, "dist", "index.js"),
      'export const x = 42;',
    );
    const pkg: PackageJson = {
      exports: { ".": "./dist/index.js" },
    };
    const ctx = await buildContext(pkg, testDir);
    const diags = await allFilesFormatRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("skips when no build output", async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
    const pkg: PackageJson = {};
    const ctx = await buildContext(pkg, testDir);
    const diags = await allFilesFormatRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("excludes npm default dirs (test, docs, examples) from allJsFiles", async () => {
    // Create files in dirs that should be excluded
    for (const dir of ["test", "docs", "examples", "__tests__"]) {
      await mkdir(join(testDir, dir), { recursive: true });
      await writeFile(join(testDir, dir, "file.js"), 'export const x = 1;');
    }
    // Create a file in dist that should be included
    await writeFile(join(testDir, "dist", "index.js"), 'export const x = 1;');

    const pkg: PackageJson = {}; // no exports, no files field
    const ctx = await buildContext(pkg, testDir);
    // allJsFiles should not contain files from excluded dirs
    expect(ctx.allJsFiles.some((f) => f.startsWith("test/"))).toBe(false);
    expect(ctx.allJsFiles.some((f) => f.startsWith("docs/"))).toBe(false);
    expect(ctx.allJsFiles.some((f) => f.startsWith("examples/"))).toBe(false);
    expect(ctx.allJsFiles.some((f) => f.startsWith("__tests__/"))).toBe(false);
    // dist files should still be present
    expect(ctx.allJsFiles.some((f) => f.startsWith("dist/"))).toBe(true);
  });

  it("does not exclude npm default dirs when files field is set", async () => {
    await mkdir(join(testDir, "test"), { recursive: true });
    await writeFile(join(testDir, "test", "file.js"), 'export const x = 1;');

    const pkg: PackageJson = { files: ["test", "dist"] };
    const ctx = await buildContext(pkg, testDir);
    expect(ctx.allJsFiles.some((f) => f.startsWith("test/"))).toBe(true);
  });
});
