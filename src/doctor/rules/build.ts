import { statSync } from "node:fs";
import { join } from "node:path";
import { readdirSync } from "node:fs";
import type { DoctorRule } from "../framework/types.js";

export const buildOutputRule: DoctorRule = {
  meta: {
    id: "build/output-exists",
    description: "Check that build output directory exists",
    defaultSeverity: "warning",
    fixable: false,
    category: "build",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) {
      return [
        {
          severity: "warning",
          message: "No build output found (dist/, lib/, build/, out/). Run your build first.",
        },
      ];
    }
    return [];
  },
};

export const buildOutputFreshRule: DoctorRule = {
  meta: {
    id: "build/output-fresh",
    description: "Check that build output is not stale (newer than source)",
    defaultSeverity: "warning",
    fixable: false,
    category: "build",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];

    const outDir = (ctx.compilerOptions?.["outDir"] as string | undefined) ?? "dist";
    const distPath = join(ctx.dir, outDir);
    const srcPath = join(ctx.dir, "src");

    let distMtime: number;
    let srcMtime: number;

    try {
      distMtime = getNewestMtime(distPath);
    } catch {
      return [];
    }

    try {
      srcMtime = getNewestMtime(srcPath);
    } catch {
      return [];
    }

    if (srcMtime > distMtime) {
      return [
        {
          severity: "warning",
          message: `Build output may be stale — source files are newer than ${outDir}/.`,
        },
      ];
    }
    return [];
  },
};

function getNewestMtime(dir: string): number {
  let newest = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = getNewestMtime(full);
        if (nested > newest) newest = nested;
      } else {
        const mtime = statSync(full).mtimeMs;
        if (mtime > newest) newest = mtime;
      }
    }
  } catch {
    // skip
  }
  return newest;
}

export const buildRules: DoctorRule[] = [buildOutputRule, buildOutputFreshRule];
