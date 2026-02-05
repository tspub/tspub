import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileExists } from "../shared/resolve.js";
import {
  generateConventionalChangelog,
  isConventionalFormat,
} from "./changelog-conventional.js";

export type ChangelogStyle = "simple" | "conventional" | "auto";

export async function generateChangelog(
  dir: string,
  version: string,
  style: ChangelogStyle = "auto",
): Promise<void> {
  if (style === "conventional") {
    return generateConventionalChangelog(dir, version);
  }

  if (style === "auto") {
    // Auto-detect: if >50% of commits are conventional, use that format
    try {
      const commits = execFileSync("git", ["log", "--format=%s", "-20"], {
        cwd: dir,
        encoding: "utf-8",
      })
        .trim()
        .split("\n")
        .filter(Boolean);
      if (isConventionalFormat(commits)) {
        return generateConventionalChangelog(dir, version);
      }
    } catch {
      // Fall through to simple
    }
  }

  // Simple format
  const changelogPath = join(dir, "CHANGELOG.md");
  const existing = (await fileExists(changelogPath))
    ? await readFile(changelogPath, "utf-8")
    : "# Changelog\n";

  let commits = "";
  try {
    const lastTag = execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      cwd: dir,
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    commits = execFileSync("git", ["log", `${lastTag}..HEAD`, "--oneline", "--", "."], {
      cwd: dir,
      encoding: "utf-8",
    }).trim();
  } catch {
    try {
      commits = execFileSync("git", ["log", "--oneline", "-20", "--", "."], {
        cwd: dir,
        encoding: "utf-8",
      }).trim();
    } catch {
      commits = "- Initial release";
    }
  }

  const date = new Date().toISOString().split("T")[0];
  const entry = `\n## ${version} (${date})\n\n${commits
    .split("\n")
    .map((line) => {
      const spaceIndex = line.indexOf(" ");
      return spaceIndex > -1 ? `- ${line.slice(spaceIndex + 1)}` : `- ${line}`;
    })
    .join("\n")}\n`;

  // Match common changelog heading variations
  const headingMatch = existing.match(/^(#\s*[Cc]hangelog\s*)\n/m);
  if (headingMatch) {
    const updated = existing.replace(headingMatch[0], `${headingMatch[1]}\n${entry}`);
    await writeFile(changelogPath, updated);
  } else {
    // No heading found — prepend with heading
    await writeFile(changelogPath, `# Changelog\n${entry}\n${existing}`);
  }
}
