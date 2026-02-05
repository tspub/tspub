import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { BumpType, Changeset, ChangesetEntry } from "./types.js";

export function parseChangesetContent(content: string, id: string): Changeset {
  const lines = content.split("\n");

  let firstDash = -1;
  let secondDash = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim() === "---") {
      if (firstDash === -1) {
        firstDash = i;
      } else {
        secondDash = i;
        break;
      }
    }
  }

  if (firstDash === -1 || secondDash === -1) {
    throw new Error(`Invalid changeset format in "${id}": missing --- delimiters`);
  }

  const entries: ChangesetEntry[] = [];

  for (let i = firstDash + 1; i < secondDash; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;

    const match = line.match(/^"([^"]+)":\s*(major|minor|patch)$/);
    if (!match) {
      throw new Error(`Invalid changeset entry in "${id}": ${line}`);
    }

    entries.push({
      packageName: match[1]!,
      bump: match[2]! as BumpType,
    });
  }

  const summary = lines
    .slice(secondDash + 1)
    .join("\n")
    .trim();

  return { id, entries, summary };
}

export async function parseChangeset(filePath: string): Promise<Changeset> {
  const content = await readFile(filePath, "utf-8");
  const id = basename(filePath, ".md");
  return parseChangesetContent(content, id);
}
