import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { parseConventionalCommit } from "../builder/changelog-conventional.js";

export interface VersionBump {
  bump: "major" | "minor" | "patch" | null;
  reason: string;
}

export function resolveVersionBump(dir: string, packageName?: string): VersionBump {
  // Find the git root so tag lookups work from monorepo subdirectories
  let gitRoot = dir;
  try {
    gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: dir,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
  } catch {
    // Not a git repo or git unavailable — fall through
  }

  let lastTag = "";
  try {
    // When in a monorepo, look for package-scoped tags first (e.g. pkg@1.0.0)
    if (packageName) {
      lastTag = execFileSync("git", ["describe", "--tags", "--abbrev=0", "--match", `${packageName}@*`], {
        cwd: gitRoot,
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();
    } else {
      lastTag = execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
        cwd: gitRoot,
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();
    }
  } catch {
    // No tags — use all commits
  }

  const logArgs = ["log", "--format=%s"];
  if (lastTag) {
    logArgs.splice(1, 0, `${lastTag}..HEAD`);
  }

  // If package directory is a subdirectory (monorepo), filter commits by path
  if (packageName) {
    logArgs.push("--", relative(gitRoot, dir) || ".");
  }

  let rawCommits = "";
  try {
    rawCommits = execFileSync("git", logArgs, { cwd: gitRoot, encoding: "utf-8" }).trim();
  } catch {
    return { bump: null, reason: "no commits found" };
  }

  if (!rawCommits) {
    return { bump: null, reason: "no commits since last tag" };
  }

  const lines = rawCommits.split("\n").filter(Boolean);
  let highest: "major" | "minor" | "patch" | null = null;
  let reason = "";

  for (const line of lines) {
    const parsed = parseConventionalCommit(line);
    if (!parsed) {
      // Non-conventional commit counts as patch
      if (!highest) {
        highest = "patch";
        reason = line;
      }
      continue;
    }

    if (parsed.breaking || line.includes("BREAKING CHANGE")) {
      return { bump: "major", reason: `${line} (breaking change)` };
    }

    if (parsed.type === "feat") {
      highest = "minor";
      reason = `${line} (minor)`;
    } else if (highest !== "minor") {
      highest = "patch";
      reason = `${line} (patch)`;
    }
  }

  return { bump: highest, reason };
}
