import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseGitHubUrl } from "../../src/scanner/github.js";
import { findPackageDirs } from "../../src/scanner/clone.js";
import type { ScanError, ScanResult } from "../../src/scanner/index.js";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";

const tmpDir = join(import.meta.dirname, "..", ".tmp-scanner-test");

describe("parseGitHubUrl", () => {
  it("parses standard GitHub URL", () => {
    const result = parseGitHubUrl("https://github.com/user/repo");
    expect(result.repo).toBe("user/repo");
    expect(result.cloneUrl).toBe("https://github.com/user/repo.git");
  });

  it("parses GitHub URL with .git suffix", () => {
    const result = parseGitHubUrl("https://github.com/user/repo.git");
    expect(result.repo).toBe("user/repo");
    expect(result.cloneUrl).toBe("https://github.com/user/repo.git");
  });

  it("parses GitHub URL with trailing slash", () => {
    const result = parseGitHubUrl("https://github.com/user/repo/");
    expect(result.repo).toBe("user/repo");
  });

  it("throws on invalid URL", () => {
    expect(() => parseGitHubUrl("https://example.com/foo")).toThrow("Invalid GitHub URL");
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
});

describe("ScanError type", () => {
  it("has correct structure", () => {
    const error: ScanError = {
      repo: "user/repo",
      phase: "clone",
      message: "Failed to clone repository",
    };

    expect(error.repo).toBe("user/repo");
    expect(error.phase).toBe("clone");
    expect(error.message).toBe("Failed to clone repository");
  });

  it("supports all phase types", () => {
    const cloneError: ScanError = {
      repo: "user/repo",
      phase: "clone",
      message: "Clone failed",
    };

    const discoverError: ScanError = {
      repo: "user/repo",
      phase: "discover",
      message: "Discovery failed",
    };

    const checkError: ScanError = {
      repo: "user/repo",
      phase: "check",
      message: "Check failed",
    };

    expect(cloneError.phase).toBe("clone");
    expect(discoverError.phase).toBe("discover");
    expect(checkError.phase).toBe("check");
  });
});

describe("ScanResult type", () => {
  it("includes optional errors field", () => {
    const resultWithErrors: ScanResult = {
      repo: "user/repo",
      packages: [],
      errors: [
        {
          repo: "user/repo",
          phase: "clone",
          message: "Failed",
        },
      ],
    };

    expect(resultWithErrors.errors).toBeDefined();
    expect(resultWithErrors.errors).toHaveLength(1);
    expect(resultWithErrors.errors![0]!.phase).toBe("clone");
  });

  it("includes optional timing field", () => {
    const resultWithTiming: ScanResult = {
      repo: "user/repo",
      packages: [],
      timing: {
        cloneMs: 1500,
        checkMs: 2500,
      },
    };

    expect(resultWithTiming.timing).toBeDefined();
    expect(resultWithTiming.timing!.cloneMs).toBe(1500);
    expect(resultWithTiming.timing!.checkMs).toBe(2500);
  });

  it("works without optional fields", () => {
    const minimalResult: ScanResult = {
      repo: "user/repo",
      packages: [],
    };

    expect(minimalResult.repo).toBe("user/repo");
    expect(minimalResult.packages).toEqual([]);
    expect(minimalResult.errors).toBeUndefined();
    expect(minimalResult.timing).toBeUndefined();
  });

  it("includes packages with results", () => {
    const result: ScanResult = {
      repo: "user/repo",
      packages: [
        {
          name: "test-pkg",
          dir: ".",
          errors: 1,
          warnings: 2,
          infos: 0,
          results: [
            {
              ruleId: "test/rule",
              message: "Test message",
              severity: "error",
            },
          ],
        },
      ],
    };

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]!.name).toBe("test-pkg");
    expect(result.packages[0]!.errors).toBe(1);
    expect(result.packages[0]!.results).toHaveLength(1);
  });
});
