import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveVersionBump } from "../../src/publisher/version-from-commits.js";
import { join } from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const tmpDir = join(import.meta.dirname, "..", ".tmp-version-comprehensive");

function git(cmd: string, cwd = tmpDir): string {
  return execSync(cmd, { cwd, encoding: "utf-8" }).trim();
}

function commitFile(filename: string, msg: string): void {
  writeFileSync(join(tmpDir, filename), filename + Date.now());
  git("git add -A");
  git(`git commit -m "${msg}"`);
}

beforeEach(async () => {
  await mkdir(tmpDir, { recursive: true });
  git("git init");
  git("git config user.email test@test.com");
  git("git config user.name test");
  writeFileSync(join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));
  git("git add -A");
  git('git commit -m "init"');
  git("git tag v1.0.0");
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("resolveVersionBump", () => {
  it("returns null when no commits since tag", () => {
    expect(resolveVersionBump(tmpDir).bump).toBeNull();
  });

  it("detects patch from fix: prefix", () => {
    commitFile("a.txt", "fix: resolve edge case");
    expect(resolveVersionBump(tmpDir).bump).toBe("patch");
  });

  it("detects minor from feat: prefix", () => {
    commitFile("b.txt", "feat: add new API");
    expect(resolveVersionBump(tmpDir).bump).toBe("minor");
  });

  it("detects major from feat!: breaking", () => {
    commitFile("c.txt", "feat!: redesign API");
    expect(resolveVersionBump(tmpDir).bump).toBe("major");
  });

  it("detects major from BREAKING CHANGE in message", () => {
    commitFile("d.txt", "refactor: BREAKING CHANGE drop node 14");
    expect(resolveVersionBump(tmpDir).bump).toBe("major");
  });

  it("highest bump wins across multiple commits", () => {
    commitFile("e.txt", "fix: small fix");
    commitFile("f.txt", "docs: update readme");
    commitFile("g.txt", "feat: new feature");
    commitFile("h.txt", "fix: another fix");
    expect(resolveVersionBump(tmpDir).bump).toBe("minor");
  });

  it("major stops search immediately", () => {
    commitFile("i.txt", "feat!: breaking");
    commitFile("j.txt", "feat: another feature");
    const result = resolveVersionBump(tmpDir);
    expect(result.bump).toBe("major");
    expect(result.reason).toContain("breaking");
  });

  it("non-conventional commits are treated as patch", () => {
    commitFile("k.txt", "updated stuff");
    expect(resolveVersionBump(tmpDir).bump).toBe("patch");
  });

  it("works with no prior tags (all commits counted)", async () => {
    const freshDir = join(tmpDir, "fresh");
    await mkdir(freshDir, { recursive: true });
    git("git init", freshDir);
    git("git config user.email test@test.com", freshDir);
    git("git config user.name test", freshDir);
    writeFileSync(join(freshDir, "x.txt"), "x");
    git("git add -A", freshDir);
    git('git commit -m "feat: initial"', freshDir);
    expect(resolveVersionBump(freshDir).bump).toBe("minor");
  });

  it("includes reason string", () => {
    commitFile("l.txt", "feat: add logging");
    const result = resolveVersionBump(tmpDir);
    expect(result.reason).toContain("feat: add logging");
  });
});
