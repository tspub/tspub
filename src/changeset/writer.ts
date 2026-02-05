import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ChangesetEntry } from "./types.js";

export async function writeChangeset(
  dir: string,
  entries: ChangesetEntry[],
  summary: string,
): Promise<string> {
  const id = randomUUID().slice(0, 8);
  const changesetDir = join(dir, ".changeset");

  await mkdir(changesetDir, { recursive: true });

  const frontmatter = entries
    .map((e) => `"${e.packageName}": ${e.bump}`)
    .join("\n");

  const content = `---\n${frontmatter}\n---\n\n${summary}\n`;

  const filePath = join(changesetDir, `${id}.md`);
  await writeFile(filePath, content, "utf-8");

  return filePath;
}
