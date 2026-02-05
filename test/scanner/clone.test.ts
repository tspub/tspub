import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cloneRepo, cloneRepoAsync, findPackageDirs } from "../../src/scanner/clone.js";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";

const tmpDir = join(import.meta.dirname, "..", ".tmp-clone-test");

describe("cloneRepo retry logic", () => {
  it("throws after 1 retry attempt on invalid URL", () => {
    const invalidUrl = "https://github.com/nonexistent/invalid-repo-12345.git";

    expect(() => {
      cloneRepo(invalidUrl, { retries: 1 });
    }).toThrow(/Failed to clone.*after 1 attempts/);
  });
});

describe("cloneRepoAsync retry logic", () => {
  it("throws after 1 retry attempt on invalid URL", async () => {
    const invalidUrl = "https://github.com/nonexistent/invalid-repo-12345.git";

    await expect(
      cloneRepoAsync(invalidUrl, { retries: 1 })
    ).rejects.toThrow(/Failed to clone.*after 1 attempts/);
  });
});

describe("findPackageDirs", () => {
  beforeEach(async () => {
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("finds root package.json", async () => {
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({ name: "test", version: "1.0.0" }),
    );

    const dirs = findPackageDirs(tmpDir);
    expect(dirs).toContain(".");
  });

  it("finds packages in packages/ directory", async () => {
    // Root has no publishable package
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ private: true }));

    // packages/foo is a real package
    await mkdir(join(tmpDir, "packages", "foo"), { recursive: true });
    await writeFile(
      join(tmpDir, "packages", "foo", "package.json"),
      JSON.stringify({ name: "foo", version: "1.0.0" }),
    );

    const dirs = findPackageDirs(tmpDir);
    expect(dirs).toContain("packages/foo");
  });

  it("skips packages without name+version", async () => {
    await mkdir(join(tmpDir, "packages", "bad"), { recursive: true });
    await writeFile(
      join(tmpDir, "packages", "bad", "package.json"),
      JSON.stringify({ private: true }),
    );

    const dirs = findPackageDirs(tmpDir);
    expect(dirs).not.toContain("packages/bad");
  });

  it("finds nested workspace packages", async () => {
    // Create workspace with packages in libs/
    await writeFile(
      join(tmpDir, "package.json"),
      JSON.stringify({
        name: "monorepo",
        version: "1.0.0",
        workspaces: ["libs/*"]
      }),
    );

    await mkdir(join(tmpDir, "libs", "pkg-a"), { recursive: true });
    await writeFile(
      join(tmpDir, "libs", "pkg-a", "package.json"),
      JSON.stringify({ name: "pkg-a", version: "1.0.0" }),
    );

    const dirs = findPackageDirs(tmpDir);
    expect(dirs).toContain(".");
    expect(dirs).toContain("libs/pkg-a");
  });
});
