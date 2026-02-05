import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { buildContext } from "../../src/checker/framework/context.js";
import { packageSizeRule } from "../../src/checker/rules/size/package-size.js";
import type { PackageJson } from "../../src/shared/package-json.js";

describe("size/package-size", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), "tspub-test-size-" + Date.now());
    await mkdir(join(testDir, "dist"), { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("passes for small package", async () => {
    await writeFile(join(testDir, "dist", "index.js"), 'export const x = 42;');
    const ctx = await buildContext({}, testDir);
    const diags = await packageSizeRule.check(ctx);
    expect(diags).toHaveLength(0);
  });

  it("warns for large package (>1MB)", async () => {
    // Create a file larger than 1MB
    const largeContent = "x".repeat(1.5 * 1024 * 1024);
    await writeFile(join(testDir, "dist", "big.js"), largeContent);
    const ctx = await buildContext({}, testDir);
    const diags = await packageSizeRule.check(ctx);
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].severity).toBe("warning");
    expect(diags[0].message).toContain("MB");
  });

  it("skips when no dist directory", async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
    const ctx = await buildContext({}, testDir);
    const diags = await packageSizeRule.check(ctx);
    expect(diags).toHaveLength(0);
  });
});
