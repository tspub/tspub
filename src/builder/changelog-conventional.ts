import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileExists } from "../shared/resolve.js";
import { logger } from "../shared/logger.js";

export interface ConventionalCommit {
  type: string;
  scope: string | null;
  breaking: boolean;
  message: string;
  raw: string;
}

export function parseConventionalCommit(
  msg: string,
): ConventionalCommit | null {
  const match = msg.match(
    /^(\w+)(?:\(([^)]*)\))?(!)?\s*:\s*(.+)$/,
  );
  if (!match) return null;
  return {
    type: match[1]!,
    scope: match[2] ?? null,
    breaking: match[3] === "!",
    message: match[4]!.trim(),
    raw: msg,
  };
}

const TYPE_LABELS: Record<string, string> = {
  feat: "Features",
  fix: "Bug Fixes",
  perf: "Performance",
  refactor: "Refactoring",
  docs: "Documentation",
  test: "Tests",
  chore: "Chores",
};

export async function generateConventionalChangelog(
  dir: string,
  version: string,
): Promise<void> {
  const changelogPath = join(dir, "CHANGELOG.md");
  const existing = (await fileExists(changelogPath))
    ? await readFile(changelogPath, "utf-8")
    : "# Changelog\n";

  let rawCommits = "";
  try {
    const lastTag = execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      cwd: dir,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    rawCommits = execFileSync("git", ["log", `${lastTag}..HEAD`, "--format=%s", "--", "."], {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
  } catch {
    try {
      rawCommits = execFileSync("git", ["log", "--format=%s", "-20", "--", "."], {
        cwd: dir,
        encoding: "utf-8",
      }).trim();
    } catch {
      rawCommits = "";
    }
  }

  if (!rawCommits) {
    logger.verbose("No commits found for changelog");
    return;
  }

  const lines = rawCommits.split("\n").filter(Boolean);
  const parsed = lines
    .map(parseConventionalCommit)
    .filter((c): c is ConventionalCommit => c !== null);

  // Group by type
  const groups = new Map<string, ConventionalCommit[]>();
  const breaking: ConventionalCommit[] = [];

  for (const commit of parsed) {
    if (commit.breaking) {
      breaking.push(commit);
    }
    const label = TYPE_LABELS[commit.type] ?? commit.type;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(commit);
  }

  const date = new Date().toISOString().split("T")[0];
  let entry = `\n## ${version} (${date})\n`;

  if (breaking.length > 0) {
    entry += "\n### BREAKING CHANGES\n\n";
    for (const c of breaking) {
      const scope = c.scope ? `**${c.scope}:** ` : "";
      entry += `- ${scope}${c.message}\n`;
    }
  }

  for (const [label, commits] of groups) {
    entry += `\n### ${label}\n\n`;
    for (const c of commits) {
      const scope = c.scope ? `**${c.scope}:** ` : "";
      entry += `- ${scope}${c.message}\n`;
    }
  }

  // Match common changelog heading variations
  const headingMatch = existing.match(/^(#\s*[Cc]hangelog\s*)\n/m);
  if (headingMatch) {
    const updated = existing.replace(headingMatch[0], `${headingMatch[1]}\n${entry}`);
    await writeFile(changelogPath, updated);
  } else {
    await writeFile(changelogPath, `# Changelog\n${entry}\n${existing}`);
  }
}

export function isConventionalFormat(commits: string[]): boolean {
  if (commits.length === 0) return false;
  const conventionalCount = commits.filter(
    (c) => parseConventionalCommit(c) !== null,
  ).length;
  return conventionalCount / commits.length > 0.5;
}
