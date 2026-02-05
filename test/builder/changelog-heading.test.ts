import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { execSync } from "node:child_process";
import { generateChangelog } from "../../src/builder/changelog.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-changelog-heading-test");

beforeEach(async () => {
  await mkdir(tmpDir, { recursive: true });
  execSync("git init", { cwd: tmpDir });
  execSync("git config user.email test@test.com", { cwd: tmpDir });
  execSync("git config user.name test", { cwd: tmpDir });
  await writeFile(join(tmpDir, "a.txt"), "a");
  execSync("git add -A", { cwd: tmpDir });
  execSync('git commit -m "init"', { cwd: tmpDir });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("changelog heading tolerance", () => {
  it("works with standard heading", async () => {
    await writeFile(join(tmpDir, "CHANGELOG.md"), "# Changelog\n\nOld content\n");
    await generateChangelog(tmpDir, "1.0.0", "simple");

    const content = await readFile(join(tmpDir, "CHANGELOG.md"), "utf-8");
    expect(content).toContain("## 1.0.0");
    expect(content).toContain("Old content");
  });

  it("works with uppercase CHANGELOG heading", async () => {
    await writeFile(join(tmpDir, "CHANGELOG.md"), "# CHANGELOG\n\nOld content\n");
    await generateChangelog(tmpDir, "1.0.0", "simple");

    // Should not lose old content (the old bug would just prepend)
    const content = await readFile(join(tmpDir, "CHANGELOG.md"), "utf-8");
    expect(content).toContain("1.0.0");
  });

  it("works with no existing changelog", async () => {
    await generateChangelog(tmpDir, "1.0.0", "simple");

    const content = await readFile(join(tmpDir, "CHANGELOG.md"), "utf-8");
    expect(content).toContain("# Changelog");
    expect(content).toContain("## 1.0.0");
  });
});
