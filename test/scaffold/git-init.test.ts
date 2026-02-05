import { describe, it, expect, afterEach } from "vitest";
import { scaffold } from "../../src/scaffold/index.js";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { fileExists } from "../../src/shared/resolve.js";

const tmpDir = join(import.meta.dirname, ".tmp-scaffold-git");

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("scaffold git init", () => {
  it("creates .git/ directory", async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(tmpDir, { recursive: true });
    await scaffold({
      name: "test-git",
      dualPublish: false,
      react: false,
      monorepo: false,
      dir: tmpDir,
      git: true,
    });
    const gitDir = join(tmpDir, "test-git", ".git");
    expect(await fileExists(gitDir)).toBe(true);
  });

  it("skips .git/ in monorepo mode", async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(tmpDir, { recursive: true });
    await scaffold({
      name: "test-mono",
      dualPublish: false,
      react: false,
      monorepo: true,
      dir: tmpDir,
    });
    const gitDir = join(tmpDir, "test-mono", ".git");
    expect(await fileExists(gitDir)).toBe(false);
  });

  it("skips .git/ when git=false", async () => {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(tmpDir, { recursive: true });
    await scaffold({
      name: "test-nogit",
      dualPublish: false,
      react: false,
      monorepo: false,
      dir: tmpDir,
      git: false,
    });
    const gitDir = join(tmpDir, "test-nogit", ".git");
    expect(await fileExists(gitDir)).toBe(false);
  });
});
