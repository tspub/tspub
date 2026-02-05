import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileExists } from "../shared/resolve.js";
import type { PackageJson } from "../shared/package-json.js";

export interface DoctorDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  category: string;
}

export function checkNodeVersion(pkg: PackageJson): DoctorDiagnostic[] {
  const required = pkg.engines?.["node"];
  if (!required) return [];

  const current = process.version;
  // Simple semver range check: extract minimum major.minor from range
  const minMatch = required.match(/(\d+)(?:\.(\d+))?/);
  if (!minMatch) return [];
  const minMajor = Number(minMatch[1]);
  const minMinor = Number(minMatch[2] ?? 0);
  const [currentMajor, currentMinor] = current.replace("v", "").split(".").map(Number) as [number, number];

  if (currentMajor < minMajor || (currentMajor === minMajor && currentMinor < minMinor)) {
    return [
      {
        severity: "error",
        message: `Node.js ${current} does not satisfy engines.node "${required}"`,
        category: "environment",
      },
    ];
  }
  return [];
}

export function checkNpmVersion(): DoctorDiagnostic[] {
  try {
    const version = execFileSync("npm", ["--version"], { encoding: "utf-8" }).trim();
    return [
      {
        severity: "info",
        message: `npm version: ${version}`,
        category: "environment",
      },
    ];
  } catch {
    return [
      {
        severity: "warning",
        message: "npm not found in PATH",
        category: "environment",
      },
    ];
  }
}

export async function checkPackageManager(
  dir: string,
): Promise<DoctorDiagnostic[]> {
  const lockFiles = [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
  ];
  const found: string[] = [];
  for (const f of lockFiles) {
    if (await fileExists(join(dir, f))) {
      found.push(f);
    }
  }

  if (found.length > 1) {
    return [
      {
        severity: "warning",
        message: `Multiple lock files detected: ${found.join(", ")}. Use a single package manager.`,
        category: "environment",
      },
    ];
  }

  return [];
}

export function checkTypeScriptVersion(pkg: PackageJson): DoctorDiagnostic[] {
  const tsVersion =
    pkg.devDependencies?.["typescript"] ?? pkg.dependencies?.["typescript"];
  if (!tsVersion) return [];

  const match = tsVersion.match(/(\d+)/);
  if (!match) return [];
  const major = Number(match[1]);

  if (major < 5) {
    return [
      {
        severity: "warning",
        message: `TypeScript ${tsVersion} is outdated. Upgrade to TypeScript 5.x for best compatibility.`,
        category: "environment",
      },
    ];
  }
  return [];
}

export function checkGitStatus(dir: string): DoctorDiagnostic[] {
  const results: DoctorDiagnostic[] = [];

  try {
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
    if (status) {
      results.push({
        severity: "warning",
        message: "Uncommitted changes detected",
        category: "git",
      });
    }
  } catch {
    results.push({
      severity: "info",
      message: "Not a git repository",
      category: "git",
    });
    return results;
  }

  try {
    execFileSync("git", ["remote", "get-url", "origin"], { cwd: dir, encoding: "utf-8" });
  } catch {
    results.push({
      severity: "warning",
      message: "No git remote configured",
      category: "git",
    });
  }

  return results;
}
