import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import type { DoctorRule } from "../framework/types.js";

export const nodeVersionRule: DoctorRule = {
  meta: {
    id: "environment/node-version",
    description: "Check Node.js version satisfies engines.node",
    defaultSeverity: "error",
    fixable: false,
    category: "environment",
  },
  check(ctx) {
    const required = ctx.pkg.engines?.["node"];
    if (!required) return [];

    const current = process.version;
    const minMatch = required.match(/(\d+)(?:\.(\d+))?/);
    if (!minMatch) return [];
    const minMajor = Number(minMatch[1]);
    const minMinor = Number(minMatch[2] ?? 0);
    const [currentMajor, currentMinor] = current
      .replace("v", "")
      .split(".")
      .map(Number) as [number, number];

    if (
      currentMajor < minMajor ||
      (currentMajor === minMajor && currentMinor < minMinor)
    ) {
      return [
        {
          severity: "error",
          message: `Node.js ${current} does not satisfy engines.node "${required}"`,
        },
      ];
    }
    return [];
  },
};

export const npmVersionRule: DoctorRule = {
  meta: {
    id: "environment/npm-version",
    description: "Check npm is available",
    defaultSeverity: "info",
    fixable: false,
    category: "environment",
  },
  check() {
    try {
      const version = execFileSync("npm", ["--version"], {
        encoding: "utf-8",
      }).trim();
      return [{ severity: "info", message: `npm version: ${version}` }];
    } catch {
      return [{ severity: "warning", message: "npm not found in PATH" }];
    }
  },
};

export const packageManagerRule: DoctorRule = {
  meta: {
    id: "environment/multiple-lockfiles",
    description: "Warn when multiple lock files are present",
    defaultSeverity: "warning",
    fixable: "safe",
    category: "environment",
  },
  check(ctx) {
    if (ctx.lockFiles.length > 1) {
      return [
        {
          severity: "warning",
          message: `Multiple lock files detected: ${ctx.lockFiles.join(", ")}. Use a single package manager.`,
        },
      ];
    }
    return [];
  },
  fix(ctx) {
    // Keep the first lock file found, delete extras
    // This is a heuristic — we keep package-lock.json if present
    const priority = [
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "bun.lockb",
    ];
    const sorted = [...new Set(priority)].filter((f) => {
      try {
        const { existsSync } = require("node:fs") as typeof import("node:fs");
        return existsSync(join(ctx.dir, f));
      } catch {
        return false;
      }
    });
    if (sorted.length <= 1) {
      return { message: "", pkgModified: false };
    }
    const keep = sorted[0]!;
    const removed: string[] = [];
    for (const f of sorted.slice(1)) {
      try {
        unlinkSync(join(ctx.dir, f));
        removed.push(f);
      } catch {
        // skip
      }
    }
    return {
      message: removed.length > 0
        ? `Removed extra lock file(s): ${removed.join(", ")} (kept ${keep})`
        : "",
      pkgModified: false,
    };
  },
};

export const typescriptVersionRule: DoctorRule = {
  meta: {
    id: "environment/typescript-version",
    description: "Recommend TypeScript 5.x",
    defaultSeverity: "warning",
    fixable: "safe",
    category: "environment",
  },
  check(ctx) {
    const tsVersion =
      ctx.pkg.devDependencies?.["typescript"] ??
      ctx.pkg.dependencies?.["typescript"];
    if (!tsVersion) return [];

    const match = tsVersion.match(/(\d+)/);
    if (!match) return [];
    const major = Number(match[1]);

    if (major < 5) {
      return [
        {
          severity: "warning",
          message: `TypeScript ${tsVersion} is outdated. Upgrade to TypeScript 5.x for best compatibility.`,
        },
      ];
    }
    return [];
  },
  fix(ctx) {
    try {
      execFileSync("npm", ["install", "-D", "typescript@latest"], {
        cwd: ctx.dir,
        stdio: "pipe",
      });
      return {
        message: "Upgraded TypeScript to latest",
        pkgModified: false,
      };
    } catch {
      return { message: "", pkgModified: false };
    }
  },
};

export const gitStatusRule: DoctorRule = {
  meta: {
    id: "environment/git-dirty",
    description: "Warn on uncommitted changes",
    defaultSeverity: "warning",
    fixable: false,
    category: "environment",
  },
  check(ctx) {
    try {
      const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: ctx.dir,
        encoding: "utf-8",
      }).trim();
      if (status) {
        return [
          { severity: "warning", message: "Uncommitted changes detected" },
        ];
      }
    } catch {
      return [{ severity: "info", message: "Not a git repository" }];
    }
    return [];
  },
};

export const gitRemoteRule: DoctorRule = {
  meta: {
    id: "environment/git-no-remote",
    description: "Warn when no git remote is configured",
    defaultSeverity: "warning",
    fixable: false,
    category: "environment",
  },
  check(ctx) {
    try {
      execFileSync("git", ["status", "--porcelain"], {
        cwd: ctx.dir,
        encoding: "utf-8",
      });
    } catch {
      // Not a git repo — already reported by git-dirty
      return [];
    }

    try {
      execFileSync("git", ["remote", "get-url", "origin"], {
        cwd: ctx.dir,
        encoding: "utf-8",
      });
    } catch {
      return [
        { severity: "warning", message: "No git remote configured" },
      ];
    }
    return [];
  },
};

export const environmentRules: DoctorRule[] = [
  nodeVersionRule,
  npmVersionRule,
  packageManagerRule,
  typescriptVersionRule,
  gitStatusRule,
  gitRemoteRule,
];
