import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { readPackageJson, writePackageJson } from "../shared/package-json.js";
import { fileExists } from "../shared/resolve.js";
import { parseChangeset } from "./parser.js";
import { computeDependentBumps } from "./dependent-bumping.js";
import type { PackageInfo } from "./dependent-bumping.js";
import type { BumpType, VersionUpdate } from "./types.js";

interface AggregatedEntry {
  bump: BumpType;
  summaries: string[];
  /** Set by applyFixedGroups to force a specific version for all group members. */
  targetVersion?: string;
}

function bumpVersion(version: string, bump: BumpType): string {
  const base = version.split("-")[0]!;
  const parts = base.split(".").map(Number);
  const [major = 0, minor = 0, patch = 0] = parts;
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

const BUMP_ORDER: Record<BumpType, number> = {
  patch: 0,
  minor: 1,
  major: 2,
};

/**
 * Compare two semver strings. Handles pre-release tags:
 * - A version without pre-release is greater than the same version with one
 *   (1.0.0 > 1.0.0-beta.1)
 * - Pre-release versions are compared lexicographically by dot-separated identifiers,
 *   with numeric identifiers compared as numbers.
 */
function semverGt(a: string, b: string): boolean {
  const [aBase = "", aPre] = a.split("-", 2);
  const [bBase = "", bPre] = b.split("-", 2);

  const [aMaj = 0, aMin = 0, aPat = 0] = aBase.split(".").map(Number);
  const [bMaj = 0, bMin = 0, bPat = 0] = bBase.split(".").map(Number);

  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  if (aPat !== bPat) return aPat > bPat;

  // Same base version — pre-release ordering
  // No pre-release > has pre-release (1.0.0 > 1.0.0-alpha)
  if (!aPre && bPre) return true;
  if (aPre && !bPre) return false;
  if (!aPre && !bPre) return false;

  // Both have pre-release: compare dot-separated identifiers
  const aIds = aPre!.split(".");
  const bIds = bPre!.split(".");
  const len = Math.max(aIds.length, bIds.length);
  for (let i = 0; i < len; i++) {
    const aId = aIds[i];
    const bId = bIds[i];
    if (aId === undefined) return false; // fewer ids = lower precedence
    if (bId === undefined) return true;
    const aNum = /^\d+$/.test(aId) ? Number(aId) : NaN;
    const bNum = /^\d+$/.test(bId) ? Number(bId) : NaN;
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum > bNum;
    } else {
      // Lexicographic comparison; numeric < string per semver spec
      if (!isNaN(aNum)) return false;
      if (!isNaN(bNum)) return true;
      if (aId !== bId) return aId > bId;
    }
  }
  return false;
}

export { semverGt as _semverGt };

export interface ConsumeOptions {
  linked?: string[][];
  fixed?: string[][];
  dependentBumping?: "major" | "all" | "none";
}

export interface ConsumeResult {
  updates: VersionUpdate[];
  /** Call this after committing or confirming to delete consumed changeset files. */
  cleanup: () => Promise<void>;
}

function applyLinkedGroups(
  aggregated: Map<string, AggregatedEntry>,
  linked: string[][],
): void {
  for (const group of linked) {
    let highestBump: BumpType | null = null;
    for (const name of group) {
      const entry = aggregated.get(name);
      if (entry && (!highestBump || BUMP_ORDER[entry.bump] > BUMP_ORDER[highestBump])) {
        highestBump = entry.bump;
      }
    }
    if (highestBump) {
      for (const name of group) {
        if (!aggregated.has(name)) {
          aggregated.set(name, { bump: highestBump, summaries: ["Linked version bump"] });
        } else {
          aggregated.get(name)!.bump = highestBump;
        }
      }
    }
  }
}

function applyFixedGroups(
  aggregated: Map<string, AggregatedEntry>,
  fixed: string[][],
  packageVersions: Map<string, string>,
): void {
  for (const group of fixed) {
    let highestVersion = "0.0.0";
    let highestBump: BumpType | null = null;

    for (const name of group) {
      const version = packageVersions.get(name) ?? "0.0.0";
      if (semverGt(version, highestVersion)) highestVersion = version;
      const entry = aggregated.get(name);
      if (entry && (!highestBump || BUMP_ORDER[entry.bump] > BUMP_ORDER[highestBump])) {
        highestBump = entry.bump;
      }
    }

    if (highestBump) {
      const targetVersion = bumpVersion(highestVersion, highestBump);
      for (const name of group) {
        const existing = aggregated.get(name);
        if (!existing) {
          aggregated.set(name, { bump: highestBump, summaries: ["Fixed group version bump"], targetVersion });
        } else {
          existing.bump = highestBump;
          existing.targetVersion = targetVersion;
        }
      }
    }
  }
}

export async function consumeChangesets(
  rootDir: string,
  packageDirs?: Map<string, string>,
  options?: ConsumeOptions,
): Promise<ConsumeResult> {
  const changesetDir = join(rootDir, ".changeset");
  const files = await readdir(changesetDir);
  const mdFiles = files.filter((f) => f.endsWith(".md") && f !== "README.md");

  if (mdFiles.length === 0) return { updates: [], cleanup: async () => {} };

  // Parse all changesets
  const aggregated = new Map<string, AggregatedEntry>();

  for (const file of mdFiles) {
    const changeset = await parseChangeset(join(changesetDir, file));
    for (const entry of changeset.entries) {
      const existing = aggregated.get(entry.packageName);
      if (existing) {
        if (BUMP_ORDER[entry.bump] > BUMP_ORDER[existing.bump]) {
          existing.bump = entry.bump;
        }
        existing.summaries.push(changeset.summary);
      } else {
        aggregated.set(entry.packageName, {
          bump: entry.bump,
          summaries: [changeset.summary],
        });
      }
    }
  }

  // Pre-read package versions once — shared by applyFixedGroups and the update loop
  const packageVersions = new Map<string, string>();
  const allPackageNames = new Set<string>(aggregated.keys());

  // Collect names from linked/fixed groups that may not have changesets
  for (const group of options?.linked ?? []) {
    for (const name of group) allPackageNames.add(name);
  }
  for (const group of options?.fixed ?? []) {
    for (const name of group) allPackageNames.add(name);
  }

  for (const pkgName of allPackageNames) {
    const pkgDir = packageDirs?.get(pkgName) ?? rootDir;
    const pkgJson = await readPackageJson(pkgDir);
    packageVersions.set(pkgName, pkgJson.version ?? "0.0.0");
  }

  // Apply linked groups (all packages in a linked group get the highest bump)
  if (options?.linked?.length) {
    applyLinkedGroups(aggregated, options.linked);
  }

  // Apply fixed groups (all packages in a fixed group get the same version)
  if (options?.fixed?.length && packageDirs) {
    applyFixedGroups(aggregated, options.fixed, packageVersions);
  }

  // Dependent bumping: propagate bumps to dependent packages
  if (packageDirs && packageDirs.size > 0) {
    const mode = options?.dependentBumping ?? "none";
    if (mode !== "none") {
      const packageInfos: PackageInfo[] = [];
      for (const [name, dir] of packageDirs) {
        const pkg = await readPackageJson(dir);
        packageInfos.push({
          name,
          dependencies: (pkg.dependencies ?? {}) as Record<string, string>,
          devDependencies: (pkg.devDependencies ?? {}) as Record<string, string>,
        });
      }
      const initialBumps = new Map<string, BumpType>();
      for (const [name, { bump }] of aggregated) {
        initialBumps.set(name, bump);
      }
      const allBumps = computeDependentBumps(packageInfos, initialBumps, mode);
      for (const [name, bump] of allBumps) {
        if (!aggregated.has(name)) {
          aggregated.set(name, { bump, summaries: ["Dependency version bump"] });
        }
      }
    }
  }

  const updates: VersionUpdate[] = [];

  for (const [pkgName, { bump, summaries, targetVersion }] of aggregated) {
    const pkgDir = packageDirs?.get(pkgName) ?? rootDir;
    const pkgJson = await readPackageJson(pkgDir);
    const oldVersion = pkgJson.version ?? "0.0.0";
    const newVersion = targetVersion ?? bumpVersion(oldVersion, bump);

    const changelogEntry = summaries.map((s) => `- ${s}`).join("\n");
    const changelog = `## ${newVersion}\n\n${changelogEntry}`;

    // Update package.json
    pkgJson.version = newVersion;
    await writePackageJson(pkgDir, pkgJson);

    // Prepend to CHANGELOG.md
    const changelogPath = join(pkgDir, "CHANGELOG.md");
    let existingChangelog = "";
    if (await fileExists(changelogPath)) {
      existingChangelog = await readFile(changelogPath, "utf-8");
    }
    const newChangelog = existingChangelog
      ? `${changelog}\n\n${existingChangelog}`
      : `# Changelog\n\n${changelog}\n`;
    await writeFile(changelogPath, newChangelog, "utf-8");

    updates.push({
      packageName: pkgName,
      oldVersion,
      newVersion,
      bump,
      changelog,
    });
  }

  const cleanup = async () => {
    for (const file of mdFiles) {
      await unlink(join(changesetDir, file));
    }
  };

  return { updates, cleanup };
}
