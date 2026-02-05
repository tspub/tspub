import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { readPackageJson, writePackageJson } from "../shared/package-json.js";
import { parseChangeset } from "./parser.js";

export async function createSnapshot(
  rootDir: string,
  tag?: string,
  packageDirs?: Map<string, string>,
): Promise<string[]> {
  const changesetDir = join(rootDir, ".changeset");
  const files = await readdir(changesetDir);
  const mdFiles = files.filter((f) => f.endsWith(".md") && f !== "README.md");

  const packages = new Set<string>();

  for (const file of mdFiles) {
    const changeset = await parseChangeset(join(changesetDir, file));
    for (const entry of changeset.entries) {
      packages.add(entry.packageName);
    }
  }

  const timestamp = Date.now();
  const suffix = tag ? `${tag}-${timestamp}` : `snapshot-${timestamp}`;
  const snapshotVersion = `0.0.0-${suffix}`;
  const versions: string[] = [];

  for (const pkgName of packages) {
    const pkgDir = packageDirs?.get(pkgName) ?? rootDir;
    const pkgJson = await readPackageJson(pkgDir);
    pkgJson.version = snapshotVersion;
    await writePackageJson(pkgDir, pkgJson);
    versions.push(`${pkgName}@${snapshotVersion}`);
  }

  return versions;
}
