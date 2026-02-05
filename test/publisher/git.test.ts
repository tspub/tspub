import { describe, it, expect, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  checkDirtyTree,
  checkBranch,
  commitRelease,
  tagRelease,
  rollbackRelease,
} from "../../src/publisher/git.js";

const tmpDir = join(import.meta.dirname, ".tmp-git-test");

function setupGitRepo(dir: string): void {
  mkdirSync(dir, { recursive: true });
  execFileSync("git", ["init"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "Test User"], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: dir, stdio: "pipe" });

  // Create initial commit
  writeFileSync(join(dir, "README.md"), "# Test\n");
  execFileSync("git", ["add", "."], { cwd: dir, stdio: "pipe" });
  execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: dir, stdio: "pipe" });
}

afterEach(() => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
});

describe("git: checkDirtyTree", () => {
  it("returns dirty: false on clean repo", () => {
    setupGitRepo(tmpDir);
    const result = checkDirtyTree(tmpDir);
    expect(result.dirty).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("returns dirty: true when there are uncommitted changes", () => {
    setupGitRepo(tmpDir);
    writeFileSync(join(tmpDir, "newfile.txt"), "content");
    const result = checkDirtyTree(tmpDir);
    expect(result.dirty).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns dirty: true when there are staged changes", () => {
    setupGitRepo(tmpDir);
    writeFileSync(join(tmpDir, "staged.txt"), "staged content");
    execFileSync("git", ["add", "staged.txt"], { cwd: tmpDir, stdio: "pipe" });
    const result = checkDirtyTree(tmpDir);
    expect(result.dirty).toBe(true);
  });

  it("returns error when not a git repo", () => {
    // Use /tmp to ensure we're outside any git repo
    const nonGitDir = mkdtempSync(join(tmpdir(), "tspub-test-"));
    try {
      const result = checkDirtyTree(nonGitDir);
      expect(result.dirty).toBe(false);
      expect(result.error).toBeDefined();
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true });
    }
  });
});

describe("git: checkBranch", () => {
  it("returns ok: true when on allowed branch", () => {
    setupGitRepo(tmpDir);
    const result = checkBranch(tmpDir, ["main", "master"]);
    expect(result.ok).toBe(true);
    expect(result.branch).toMatch(/^(main|master)$/);
  });

  it("returns ok: false when on disallowed branch", () => {
    setupGitRepo(tmpDir);
    execFileSync("git", ["checkout", "-b", "feature/test"], { cwd: tmpDir, stdio: "pipe" });
    const result = checkBranch(tmpDir, ["main", "master"]);
    expect(result.ok).toBe(false);
    expect(result.branch).toBe("feature/test");
  });

  it("returns ok: true when single allowed branch matches", () => {
    setupGitRepo(tmpDir);
    execFileSync("git", ["checkout", "-b", "develop"], { cwd: tmpDir, stdio: "pipe" });
    const result = checkBranch(tmpDir, ["develop"]);
    expect(result.ok).toBe(true);
    expect(result.branch).toBe("develop");
  });
});

describe("git: commitRelease", () => {
  it("creates commit with release message", () => {
    setupGitRepo(tmpDir);
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ version: "1.0.0" }));

    const sha = commitRelease(tmpDir, "1.0.0", ["package.json"]);

    expect(sha).toBeTruthy();
    expect(sha).toMatch(/^[0-9a-f]{40}$/);

    const message = execFileSync("git", ["log", "-1", "--pretty=%B"], {
      cwd: tmpDir,
      encoding: "utf-8",
    }).trim();
    expect(message).toBe("release: v1.0.0");
  });

  it("stages multiple files", () => {
    setupGitRepo(tmpDir);
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ version: "1.0.0" }));
    writeFileSync(join(tmpDir, "CHANGELOG.md"), "# Changelog\n");

    commitRelease(tmpDir, "1.0.0", ["package.json", "CHANGELOG.md"]);

    const files = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"], {
      cwd: tmpDir,
      encoding: "utf-8",
    }).trim().split("\n");

    expect(files).toContain("package.json");
    expect(files).toContain("CHANGELOG.md");
  });
});

describe("git: tagRelease", () => {
  it("creates tag", () => {
    setupGitRepo(tmpDir);

    tagRelease(tmpDir, "v1.0.0");

    const tags = execFileSync("git", ["tag"], { cwd: tmpDir, encoding: "utf-8" }).trim();
    expect(tags).toBe("v1.0.0");
  });

  it("creates multiple tags", () => {
    setupGitRepo(tmpDir);

    tagRelease(tmpDir, "v1.0.0");
    tagRelease(tmpDir, "v1.0.1");

    const tags = execFileSync("git", ["tag"], { cwd: tmpDir, encoding: "utf-8" })
      .trim()
      .split("\n");
    expect(tags).toContain("v1.0.0");
    expect(tags).toContain("v1.0.1");
  });
});

describe("git: rollbackRelease", () => {
  it("reverts commit if SHA matches", () => {
    setupGitRepo(tmpDir);
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ version: "1.0.0" }));

    const sha = commitRelease(tmpDir, "1.0.0", ["package.json"]);
    tagRelease(tmpDir, "v1.0.0");

    const result = rollbackRelease(tmpDir, "1.0.0", sha);

    expect(result).toBe(true);

    // Verify tag is deleted
    const tags = execFileSync("git", ["tag"], { cwd: tmpDir, encoding: "utf-8" }).trim();
    expect(tags).toBe("");

    // Verify commit is reverted
    const message = execFileSync("git", ["log", "-1", "--pretty=%B"], {
      cwd: tmpDir,
      encoding: "utf-8",
    }).trim();
    expect(message).toBe("Initial commit");
  });

  it("returns false if SHA does not match", () => {
    setupGitRepo(tmpDir);
    writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ version: "1.0.0" }));

    commitRelease(tmpDir, "1.0.0", ["package.json"]);
    tagRelease(tmpDir, "v1.0.0");

    const result = rollbackRelease(tmpDir, "1.0.0", "0000000000000000000000000000000000000000");

    expect(result).toBe(false);
  });

  it("returns false if tag does not exist", () => {
    setupGitRepo(tmpDir);
    const sha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: tmpDir,
      encoding: "utf-8",
    }).trim();

    const result = rollbackRelease(tmpDir, "1.0.0", sha);

    expect(result).toBe(false);
  });
});
