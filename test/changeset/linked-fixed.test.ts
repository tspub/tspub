import { describe, it, expect, afterEach } from "vitest";
import { consumeChangesets, _semverGt } from "../../src/changeset/version.js";
import { rm, mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("semverGt", () => {
  it("compares basic versions", () => {
    expect(_semverGt("2.0.0", "1.0.0")).toBe(true);
    expect(_semverGt("1.1.0", "1.0.0")).toBe(true);
    expect(_semverGt("1.0.1", "1.0.0")).toBe(true);
    expect(_semverGt("1.0.0", "1.0.0")).toBe(false);
    expect(_semverGt("1.0.0", "2.0.0")).toBe(false);
  });

  it("release > pre-release with same base", () => {
    expect(_semverGt("1.0.0", "1.0.0-beta.1")).toBe(true);
    expect(_semverGt("1.0.0-beta.1", "1.0.0")).toBe(false);
  });

  it("compares pre-release numeric identifiers", () => {
    expect(_semverGt("1.0.0-beta.2", "1.0.0-beta.1")).toBe(true);
    expect(_semverGt("1.0.0-beta.1", "1.0.0-beta.2")).toBe(false);
    expect(_semverGt("1.0.0-beta.10", "1.0.0-beta.9")).toBe(true);
  });

  it("compares pre-release string identifiers lexicographically", () => {
    expect(_semverGt("1.0.0-beta", "1.0.0-alpha")).toBe(true);
    expect(_semverGt("1.0.0-alpha", "1.0.0-beta")).toBe(false);
  });

  it("numeric identifiers have lower precedence than string identifiers", () => {
    // Per semver spec: numeric < string
    expect(_semverGt("1.0.0-alpha", "1.0.0-1")).toBe(true);
    expect(_semverGt("1.0.0-1", "1.0.0-alpha")).toBe(false);
  });

  it("fewer identifiers have lower precedence", () => {
    expect(_semverGt("1.0.0-beta.1", "1.0.0-beta")).toBe(true);
    expect(_semverGt("1.0.0-beta", "1.0.0-beta.1")).toBe(false);
  });

  it("equal pre-releases are not greater", () => {
    expect(_semverGt("1.0.0-beta.1", "1.0.0-beta.1")).toBe(false);
  });
});

describe("consumeChangesets with linked groups", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  async function setupMonorepo(packages: Array<{ name: string; version: string; deps?: Record<string, string> }>) {
    tmpDir = join(tmpdir(), `tspub-linked-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "root", private: true }));

    const packageDirs = new Map<string, string>();
    for (const p of packages) {
      const dir = join(tmpDir, "packages", p.name);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "package.json"), JSON.stringify({
        name: p.name,
        version: p.version,
        dependencies: p.deps ?? {},
      }));
      packageDirs.set(p.name, dir);
    }
    return packageDirs;
  }

  it("linked: all packages in group get highest bump", async () => {
    const packageDirs = await setupMonorepo([
      { name: "pkg-a", version: "1.0.0" },
      { name: "pkg-b", version: "1.0.0" },
      { name: "pkg-c", version: "1.0.0" },
    ]);

    await writeFile(
      join(tmpDir, ".changeset/bump-a.md"),
      '---\n"pkg-a": minor\n---\n\nNew feature in A',
    );

    const { updates } = await consumeChangesets(tmpDir, packageDirs, {
      linked: [["pkg-a", "pkg-b"]],
    });

    const aUpdate = updates.find(u => u.packageName === "pkg-a");
    const bUpdate = updates.find(u => u.packageName === "pkg-b");
    const cUpdate = updates.find(u => u.packageName === "pkg-c");

    expect(aUpdate?.bump).toBe("minor");
    expect(aUpdate?.newVersion).toBe("1.1.0");
    expect(bUpdate?.bump).toBe("minor");
    expect(bUpdate?.newVersion).toBe("1.1.0");
    expect(cUpdate).toBeUndefined(); // not in linked group, no changeset
  });

  it("linked: highest bump wins across group", async () => {
    const packageDirs = await setupMonorepo([
      { name: "pkg-a", version: "1.0.0" },
      { name: "pkg-b", version: "1.0.0" },
    ]);

    await writeFile(
      join(tmpDir, ".changeset/bump-a.md"),
      '---\n"pkg-a": patch\n---\n\nFix in A',
    );
    await writeFile(
      join(tmpDir, ".changeset/bump-b.md"),
      '---\n"pkg-b": minor\n---\n\nFeature in B',
    );

    const { updates } = await consumeChangesets(tmpDir, packageDirs, {
      linked: [["pkg-a", "pkg-b"]],
    });

    // Both should get minor (the highest)
    expect(updates.find(u => u.packageName === "pkg-a")?.bump).toBe("minor");
    expect(updates.find(u => u.packageName === "pkg-b")?.bump).toBe("minor");
  });

  it("linked: no bump when no package in group has a changeset", async () => {
    const packageDirs = await setupMonorepo([
      { name: "pkg-a", version: "1.0.0" },
      { name: "pkg-b", version: "1.0.0" },
      { name: "pkg-c", version: "1.0.0" },
    ]);

    await writeFile(
      join(tmpDir, ".changeset/bump-c.md"),
      '---\n"pkg-c": patch\n---\n\nFix in C',
    );

    const { updates } = await consumeChangesets(tmpDir, packageDirs, {
      linked: [["pkg-a", "pkg-b"]],
    });

    // Only pkg-c should be bumped
    expect(updates).toHaveLength(1);
    expect(updates[0]!.packageName).toBe("pkg-c");
  });
});

describe("consumeChangesets with fixed groups", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  async function setupMonorepo(packages: Array<{ name: string; version: string }>) {
    tmpDir = join(tmpdir(), `tspub-fixed-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "root", private: true }));

    const packageDirs = new Map<string, string>();
    for (const p of packages) {
      const dir = join(tmpDir, "packages", p.name);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "package.json"), JSON.stringify({
        name: p.name,
        version: p.version,
      }));
      packageDirs.set(p.name, dir);
    }
    return packageDirs;
  }

  it("fixed: all packages get same target version", async () => {
    const packageDirs = await setupMonorepo([
      { name: "pkg-a", version: "1.0.0" },
      { name: "pkg-b", version: "1.2.0" },
    ]);

    await writeFile(
      join(tmpDir, ".changeset/bump.md"),
      '---\n"pkg-a": patch\n---\n\nFix in A',
    );

    const { updates } = await consumeChangesets(tmpDir, packageDirs, {
      fixed: [["pkg-a", "pkg-b"]],
    });

    // Both should get version based on highest version (1.2.0) + patch = 1.2.1
    const aUpdate = updates.find(u => u.packageName === "pkg-a");
    const bUpdate = updates.find(u => u.packageName === "pkg-b");
    expect(aUpdate?.newVersion).toBe("1.2.1");
    expect(bUpdate?.newVersion).toBe("1.2.1");
  });

  it("fixed: uses highest bump in the group", async () => {
    const packageDirs = await setupMonorepo([
      { name: "pkg-a", version: "1.0.0" },
      { name: "pkg-b", version: "1.0.0" },
    ]);

    await writeFile(
      join(tmpDir, ".changeset/fix.md"),
      '---\n"pkg-a": patch\n---\n\nFix',
    );
    await writeFile(
      join(tmpDir, ".changeset/feat.md"),
      '---\n"pkg-b": minor\n---\n\nFeat',
    );

    const { updates } = await consumeChangesets(tmpDir, packageDirs, {
      fixed: [["pkg-a", "pkg-b"]],
    });

    // Minor is highest bump, so both get 1.1.0
    expect(updates.find(u => u.packageName === "pkg-a")?.newVersion).toBe("1.1.0");
    expect(updates.find(u => u.packageName === "pkg-b")?.newVersion).toBe("1.1.0");
  });

  it("fixed: no bump when no changeset in group", async () => {
    const packageDirs = await setupMonorepo([
      { name: "pkg-a", version: "1.0.0" },
      { name: "pkg-b", version: "1.0.0" },
    ]);

    // Changeset for unrelated package
    await writeFile(
      join(tmpDir, ".changeset/other.md"),
      '---\n"pkg-c": patch\n---\n\nFix',
    );
    // pkg-c doesn't have a dir, so it falls back to rootDir
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "pkg-c", version: "0.1.0" }));

    const { updates } = await consumeChangesets(tmpDir, packageDirs, {
      fixed: [["pkg-a", "pkg-b"]],
    });

    expect(updates.find(u => u.packageName === "pkg-a")).toBeUndefined();
    expect(updates.find(u => u.packageName === "pkg-b")).toBeUndefined();
  });
});

describe("consumeChangesets with dependent bumping", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it("propagates bumps to dependents in all mode", async () => {
    tmpDir = join(tmpdir(), `tspub-depbump-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "root", private: true }));

    const packages = [
      { name: "core", version: "1.0.0", deps: {} },
      { name: "utils", version: "1.0.0", deps: { core: "^1.0.0" } },
      { name: "app", version: "1.0.0", deps: { utils: "^1.0.0" } },
    ];

    const packageDirs = new Map<string, string>();
    for (const p of packages) {
      const dir = join(tmpDir, "packages", p.name);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "package.json"), JSON.stringify({
        name: p.name,
        version: p.version,
        dependencies: p.deps,
      }));
      packageDirs.set(p.name, dir);
    }

    await writeFile(
      join(tmpDir, ".changeset/bump-core.md"),
      '---\n"core": minor\n---\n\nNew core feature',
    );

    const { updates } = await consumeChangesets(tmpDir, packageDirs, {
      dependentBumping: "all",
    });

    expect(updates.find(u => u.packageName === "core")?.bump).toBe("minor");
    expect(updates.find(u => u.packageName === "utils")?.bump).toBe("patch");
    expect(updates.find(u => u.packageName === "app")?.bump).toBe("patch");
  });

  it("does not propagate in none mode", async () => {
    tmpDir = join(tmpdir(), `tspub-depbump-none-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "root", private: true }));

    const dir1 = join(tmpDir, "packages/core");
    const dir2 = join(tmpDir, "packages/utils");
    await mkdir(dir1, { recursive: true });
    await mkdir(dir2, { recursive: true });
    await writeFile(join(dir1, "package.json"), JSON.stringify({ name: "core", version: "1.0.0" }));
    await writeFile(join(dir2, "package.json"), JSON.stringify({ name: "utils", version: "1.0.0", dependencies: { core: "^1.0.0" } }));

    await writeFile(
      join(tmpDir, ".changeset/bump.md"),
      '---\n"core": minor\n---\n\nFeature',
    );

    const packageDirs = new Map([["core", dir1], ["utils", dir2]]);
    const { updates } = await consumeChangesets(tmpDir, packageDirs, {
      dependentBumping: "none",
    });

    expect(updates).toHaveLength(1);
    expect(updates[0]!.packageName).toBe("core");
  });
});
