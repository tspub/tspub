import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface CloneOptions {
  retries?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cloneRepo(cloneUrl: string, options?: CloneOptions): string {
  const retries = options?.retries ?? 3;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    const dir = mkdtempSync(join(tmpdir(), "tspub-scan-"));
    try {
      execFileSync("git", ["clone", "--depth", "1", cloneUrl, dir], {
        stdio: "pipe",
        encoding: "utf-8",
        timeout: 60_000,
      });
      return dir;
    } catch (err) {
      rmSync(dir, { recursive: true, force: true });
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) {
        // Synchronous backoff: 1s, 2s, 4s
        const backoffMs = 1000 * Math.pow(2, attempt);
        const end = Date.now() + backoffMs;
        while (Date.now() < end) {
          // busy-wait (sync context)
        }
      }
    }
  }
  throw new Error(`Failed to clone ${cloneUrl} after ${retries} attempts: ${lastError?.message}`);
}

export async function cloneRepoAsync(
  cloneUrl: string,
  options?: CloneOptions,
): Promise<string> {
  const retries = options?.retries ?? 3;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    const dir = mkdtempSync(join(tmpdir(), "tspub-scan-"));
    try {
      execFileSync("git", ["clone", "--depth", "1", cloneUrl, dir], {
        stdio: "pipe",
        encoding: "utf-8",
        timeout: 60_000,
      });
      return dir;
    } catch (err) {
      rmSync(dir, { recursive: true, force: true });
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) {
        await sleep(1000 * Math.pow(2, attempt));
      }
    }
  }
  throw new Error(`Failed to clone ${cloneUrl} after ${retries} attempts: ${lastError?.message}`);
}

export function cleanupRepo(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export function findPackageDirs(repoDir: string): string[] {
  const dirs: string[] = [];

  if (existsSync(join(repoDir, "package.json"))) {
    if (isNpmPackage(join(repoDir, "package.json"))) {
      dirs.push(".");
    }
  }

  // Try workspace globs from package.json or pnpm-workspace.yaml
  const workspaceDirs = findWorkspaceDirs(repoDir);
  if (workspaceDirs.length > 0) {
    for (const wd of workspaceDirs) {
      const pkgPath = join(repoDir, wd, "package.json");
      if (existsSync(pkgPath) && isNpmPackage(pkgPath)) {
        dirs.push(wd);
      }
    }
    return dirs;
  }

  // Fallback: scan common monorepo directories (2 levels deep)
  for (const pattern of ["packages", "libs", "apps", "tools"]) {
    const base = join(repoDir, pattern);
    if (!existsSync(base)) continue;
    try {
      const entries = readdirSync(base, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pkgPath = join(base, entry.name, "package.json");
        if (existsSync(pkgPath) && isNpmPackage(pkgPath)) {
          dirs.push(join(pattern, entry.name));
        }
        // Check one more level (e.g., packages/group/pkg-a)
        try {
          const nested = readdirSync(join(base, entry.name), { withFileTypes: true });
          for (const sub of nested) {
            if (!sub.isDirectory()) continue;
            const nestedPkgPath = join(base, entry.name, sub.name, "package.json");
            if (existsSync(nestedPkgPath) && isNpmPackage(nestedPkgPath)) {
              dirs.push(join(pattern, entry.name, sub.name));
            }
          }
        } catch {
          // skip
        }
      }
    } catch {
      // skip if unreadable
    }
  }

  return dirs;
}

function findWorkspaceDirs(repoDir: string): string[] {
  // Try package.json workspaces
  try {
    const pkgRaw = readFileSync(join(repoDir, "package.json"), "utf-8");
    const pkg = JSON.parse(pkgRaw);
    let globs: string[] | undefined;
    if (Array.isArray(pkg.workspaces)) {
      globs = pkg.workspaces;
    } else if (pkg.workspaces?.packages && Array.isArray(pkg.workspaces.packages)) {
      globs = pkg.workspaces.packages;
    }
    if (globs && globs.length > 0) {
      return expandWorkspaceGlobsSync(repoDir, globs);
    }
  } catch {
    // no package.json or invalid
  }

  // Try pnpm-workspace.yaml
  try {
    const yaml = readFileSync(join(repoDir, "pnpm-workspace.yaml"), "utf-8");
    const globs = parsePnpmPackagesSync(yaml);
    if (globs.length > 0) {
      return expandWorkspaceGlobsSync(repoDir, globs);
    }
  } catch {
    // no pnpm workspace
  }

  return [];
}

function parsePnpmPackagesSync(raw: string): string[] {
  const lines = raw.split("\n");
  const globs: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = line.match(/^packages\s*:/);
    if (!m) continue;
    for (let j = i + 1; j < lines.length; j++) {
      const item = lines[j]!;
      const itemMatch = item.match(/^\s+-\s+['"]?([^'"#\s]+)['"]?/);
      if (itemMatch) {
        globs.push(itemMatch[1]!);
      } else if (/^\S/.test(item) && item.trim()) {
        break;
      }
    }
    break;
  }
  return globs;
}

function expandWorkspaceGlobsSync(rootDir: string, globs: string[]): string[] {
  const dirs: string[] = [];
  const negations: string[] = [];
  for (const g of globs) {
    if (g.startsWith("!")) {
      negations.push(g.slice(1).replace(/\/\*\*?$/, "").replace(/\/$/, ""));
      continue;
    }
    const clean = g.replace(/\/\*\*?$/, "").replace(/\/$/, "");
    const hasDoubleGlob = g.includes("**");
    const base = join(rootDir, clean);
    if (!existsSync(base)) continue;
    try {
      const entries = readdirSync(base, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const rel = join(clean, entry.name);
        if (existsSync(join(rootDir, rel, "package.json"))) {
          dirs.push(rel);
        }
        if (hasDoubleGlob) {
          try {
            const nested = readdirSync(join(base, entry.name), { withFileTypes: true });
            for (const sub of nested) {
              if (!sub.isDirectory()) continue;
              const nestedRel = join(clean, entry.name, sub.name);
              if (existsSync(join(rootDir, nestedRel, "package.json"))) {
                dirs.push(nestedRel);
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* skip */ }
  }
  if (negations.length === 0) return dirs;
  return dirs.filter(d => !negations.some(n => d === n || d.startsWith(n + "/")));
}

function isNpmPackage(pkgJsonPath: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    return Boolean(pkg.name && pkg.version);
  } catch {
    return false;
  }
}
