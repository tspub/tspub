import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { readPackageJson, writePackageJson } from "../shared/package-json.js";
import { fileExists } from "../shared/resolve.js";
import { parseChangeset } from "./parser.js";
import type { BumpType, VersionUpdate } from "./types.js";

function bumpVersion(version: string, bump: BumpType): string {
  const parts = version.split(".").map(Number);
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

export interface ConsumeResult {
  updates: VersionUpdate[];
  /** Call this after committing or confirming to delete consumed changeset files. */
  cleanup: () => Promise<void>;
}

export async function consumeChangesets(
  rootDir: string,
  packageDirs?: Map<string, string>,
): Promise<ConsumeResult> {
  const changesetDir = join(rootDir, ".changeset");
  const files = await readdir(changesetDir);
  const mdFiles = files.filter((f) => f.endsWith(".md") && f !== "README.md");

  if (mdFiles.length === 0) return { updates: [], cleanup: async () => {} };

  // Parse all changesets
  const aggregated = new Map<string, { bump: BumpType; summaries: string[] }>();

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

  const updates: VersionUpdate[] = [];

  for (const [pkgName, { bump, summaries }] of aggregated) {
    const pkgDir = packageDirs?.get(pkgName) ?? rootDir;
    const pkgJson = await readPackageJson(pkgDir);
    const oldVersion = pkgJson.version ?? "0.0.0";
    const newVersion = bumpVersion(oldVersion, bump);

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
