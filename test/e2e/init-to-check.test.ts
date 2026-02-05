import { describe, it, expect, afterEach } from "vitest";
import { scaffold } from "../../src/scaffold/index.js";
import { check } from "../../src/checker/index.js";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";

describe("integration: init → check", () => {
  const testDir = join(tmpdir(), "tspub-integration-" + Date.now());

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("scaffolded ESM package passes check (except missing dist)", async () => {
    await mkdir(testDir, { recursive: true });

    await scaffold({
      name: "int-test",
      dualPublish: false,
      react: false,
      monorepo: false,
      dir: testDir,
    });

    const pkgDir = join(testDir, "int-test");

    // Verify all expected files exist
    expect(existsSync(join(pkgDir, "package.json"))).toBe(true);
    expect(existsSync(join(pkgDir, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(pkgDir, "src", "index.ts"))).toBe(true);
    expect(existsSync(join(pkgDir, "test", "index.test.ts"))).toBe(true);
    expect(existsSync(join(pkgDir, ".github", "workflows", "ci.yml"))).toBe(true);
    expect(existsSync(join(pkgDir, "LICENSE"))).toBe(true);
    expect(existsSync(join(pkgDir, "README.md"))).toBe(true);
    expect(existsSync(join(pkgDir, ".gitignore"))).toBe(true);
    expect(existsSync(join(pkgDir, ".npmignore"))).toBe(true);

    // Run check — should have no errors except missing dist files (not built yet)
    const results = await check({ dir: pkgDir, fix: false, strict: false });
    const errors = results.filter((r) => r.severity === "error");

    // The only possible errors should be about missing dist files
    for (const err of errors) {
      expect(err.message).toMatch(/not found|missing/i);
    }
  });

  it("scaffolded dual-publish package has correct exports", async () => {
    await mkdir(testDir, { recursive: true });

    await scaffold({
      name: "dual-test",
      dualPublish: true,
      react: false,
      monorepo: false,
      dir: testDir,
    });

    const pkgDir = join(testDir, "dual-test");
    const pkgJson = JSON.parse(
      await readFile(join(pkgDir, "package.json"), "utf-8"),
    );

    expect(pkgJson.exports["."].import).toBeDefined();
    expect(pkgJson.exports["."].require).toBeDefined();
    expect(pkgJson.scripts.build).toContain("--format esm,cjs");
  });

  it("scaffolded monorepo package skips .github and LICENSE", async () => {
    await mkdir(testDir, { recursive: true });

    await scaffold({
      name: "mono-test",
      dualPublish: false,
      react: false,
      monorepo: true,
      dir: testDir,
    });

    const pkgDir = join(testDir, "mono-test");

    // Monorepo mode should skip .github and LICENSE
    expect(existsSync(join(pkgDir, ".github"))).toBe(false);
    expect(existsSync(join(pkgDir, "LICENSE"))).toBe(false);

    // But should still have package.json, tsconfig, src
    expect(existsSync(join(pkgDir, "package.json"))).toBe(true);
    expect(existsSync(join(pkgDir, "tsconfig.json"))).toBe(true);
    expect(existsSync(join(pkgDir, "src", "index.ts"))).toBe(true);

    const pkgJson = JSON.parse(
      await readFile(join(pkgDir, "package.json"), "utf-8"),
    );
    expect(pkgJson.name).toBe("@monorepo/mono-test");
    expect(pkgJson.publishConfig).toEqual({ access: "public" });

    const tsconfig = JSON.parse(
      await readFile(join(pkgDir, "tsconfig.json"), "utf-8"),
    );
    expect(tsconfig.compilerOptions.composite).toBe(true);
  });
});
