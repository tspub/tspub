import { join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { fileExists } from "../shared/resolve.js";
import { readPackageJson } from "../shared/package-json.js";
import { logger } from "../shared/logger.js";
import type { PackageJson } from "../shared/package-json.js";

export interface WorkspacePackage {
  name: string;
  dir: string;
  pkg: PackageJson;
  localDeps: string[];
}

export async function isMonorepoRoot(dir: string): Promise<boolean> {
  const pkgPath = join(dir, "package.json");
  if (await fileExists(pkgPath)) {
    try {
      const raw = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      if (Array.isArray(pkg["workspaces"])) return true;
      if (
        pkg["workspaces"] &&
        typeof pkg["workspaces"] === "object" &&
        Array.isArray((pkg["workspaces"] as Record<string, unknown>)["packages"])
      )
        return true;
    } catch (err) {
      logger.verbose(`Workspace discovery: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (await fileExists(join(dir, "pnpm-workspace.yaml"))) return true;
  return false;
}

async function getWorkspaceGlobs(dir: string): Promise<string[]> {
  // npm/yarn: workspaces field in package.json
  const pkgPath = join(dir, "package.json");
  if (await fileExists(pkgPath)) {
    try {
      const raw = await readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      if (Array.isArray(pkg["workspaces"])) {
        return pkg["workspaces"] as string[];
      }
      if (
        pkg["workspaces"] &&
        typeof pkg["workspaces"] === "object"
      ) {
        const ws = pkg["workspaces"] as Record<string, unknown>;
        if (Array.isArray(ws["packages"])) return ws["packages"] as string[];
      }
    } catch (err) {
      logger.verbose(`Workspace discovery: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // pnpm: pnpm-workspace.yaml
  const pnpmPath = join(dir, "pnpm-workspace.yaml");
  if (await fileExists(pnpmPath)) {
    try {
      const raw = await readFile(pnpmPath, "utf-8");
      return parsePnpmWorkspacePackages(raw);
    } catch (err) {
      logger.verbose(`Workspace discovery: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return [];
}

/**
 * Parse the `packages` field from pnpm-workspace.yaml content.
 * Handles:
 * - Block style: `packages:\n  - value`
 * - Flow style: `packages: ['value', "value", value]`
 * - Inline comments: `- value # comment`
 * - Quoted and unquoted values
 */
export function parsePnpmWorkspacePackages(raw: string): string[] {
  const lines = raw.split("\n");
  const globs: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const packagesMatch = line.match(/^packages\s*:\s*(.*)/);
    if (!packagesMatch) continue;

    const rest = packagesMatch[1]!.trim();

    // Flow style on same line: packages: ['a', "b", c]
    if (rest.startsWith("[")) {
      const content = extractFlowArray(rest, lines, i);
      return parseFlowArrayItems(content);
    }

    // Empty value means block style follows
    if (!rest || rest === "|" || rest === "|-" || rest === ">") {
      // Block style: read subsequent `  - value` lines
      for (let j = i + 1; j < lines.length; j++) {
        const item = lines[j]!;
        const itemMatch = item.match(/^\s+-\s+(.+)/);
        if (itemMatch) {
          globs.push(stripYamlValue(itemMatch[1]!));
        } else if (/^\S/.test(item) && item.trim()) {
          break; // New top-level key
        }
      }
      return globs;
    }

    break;
  }

  return globs;
}

function extractFlowArray(firstRest: string, lines: string[], startIdx: number): string {
  // Check if the array is fully on one line
  if (firstRest.includes("]")) {
    return firstRest;
  }
  // Multi-line flow array
  let content = firstRest;
  for (let j = startIdx + 1; j < lines.length; j++) {
    content += " " + lines[j]!.trim();
    if (lines[j]!.includes("]")) break;
  }
  return content;
}

function parseFlowArrayItems(content: string): string[] {
  // Extract content between [ and ]
  const inner = content.replace(/^[^[]*\[/, "").replace(/][^]*$/, "");
  return inner
    .split(",")
    .map((s) => stripYamlValue(s.trim()))
    .filter(Boolean);
}

function stripYamlValue(val: string): string {
  let s = val.trim();
  // Strip surrounding quotes first — content inside quotes is literal
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  // Only strip inline comments on unquoted values
  s = s.replace(/\s+#.*$/, "");
  return s.trim();
}

async function expandGlobs(rootDir: string, globs: string[]): Promise<string[]> {
  const fg = await import("fast-glob");
  const patterns = globs.map((g) => {
    // Ensure glob matches directories containing package.json
    if (g.endsWith("package.json")) return g;
    if (g.endsWith("/")) return g + "package.json";
    return g + "/package.json";
  });

  const matches = await fg.default(patterns, {
    cwd: rootDir,
    absolute: false,
    onlyFiles: true,
  });

  // Return the directory containing each package.json
  return matches.map((m) => {
    const parts = m.split("/");
    parts.pop(); // remove "package.json"
    return parts.join("/");
  });
}

export async function discoverWorkspaces(rootDir: string): Promise<WorkspacePackage[]> {
  const absRoot = resolve(rootDir);
  const globs = await getWorkspaceGlobs(absRoot);
  if (globs.length === 0) return [];

  const dirs = await expandGlobs(absRoot, globs);
  const packages: WorkspacePackage[] = [];
  const nameSet = new Set<string>();

  // First pass: read all packages
  for (const relDir of dirs) {
    const absDir = join(absRoot, relDir);
    try {
      const pkg = await readPackageJson(absDir);
      if (!pkg.name) continue;
      nameSet.add(pkg.name);
      packages.push({
        name: pkg.name,
        dir: absDir,
        pkg,
        localDeps: [],
      });
    } catch (err) {
      logger.verbose(`Skipping ${absDir}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Second pass: resolve local dependencies
  for (const wp of packages) {
    const allDeps = {
      ...wp.pkg.dependencies,
      ...wp.pkg.devDependencies,
    };
    for (const depName of Object.keys(allDeps)) {
      if (nameSet.has(depName)) {
        wp.localDeps.push(depName);
      }
    }
  }

  return packages;
}

export function topoSort(packages: WorkspacePackage[]): WorkspacePackage[] {
  const byName = new Map<string, WorkspacePackage>();
  for (const p of packages) byName.set(p.name, p);

  // Kahn's algorithm
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const p of packages) {
    if (!inDegree.has(p.name)) inDegree.set(p.name, 0);
    if (!adj.has(p.name)) adj.set(p.name, []);
    for (const dep of p.localDeps) {
      if (!byName.has(dep)) continue;
      if (!adj.has(dep)) adj.set(dep, []);
      adj.get(dep)!.push(p.name);
      inDegree.set(p.name, (inDegree.get(p.name) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, deg] of inDegree) {
    if (deg === 0) queue.push(name);
  }

  const sorted: WorkspacePackage[] = [];
  let qi = 0;
  while (qi < queue.length) {
    const name = queue[qi++]!;
    const wp = byName.get(name);
    if (wp) sorted.push(wp);
    for (const neighbor of adj.get(name) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // If cycle detected, append remaining packages
  if (sorted.length < packages.length) {
    const sortedNames = new Set(sorted.map((p) => p.name));
    const cyclic = packages.filter((p) => !sortedNames.has(p.name));
    logger.warn(
      `Dependency cycle detected among: ${cyclic.map((p) => p.name).join(", ")}. Build order may be incorrect.`,
    );
    for (const p of cyclic) sorted.push(p);
  }

  return sorted;
}

export function filterPackages(
  packages: WorkspacePackage[],
  pattern: string,
): WorkspacePackage[] {
  // Simple glob matching: supports * and ?
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".") +
      "$",
  );
  return packages.filter((p) => regex.test(p.name));
}
