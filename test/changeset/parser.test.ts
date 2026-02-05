import { describe, it, expect, afterEach } from "vitest";
import { parseChangeset, parseChangesetContent } from "../../src/changeset/parser.js";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("changeset: parser", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it("parseChangesetContent extracts entries and summary", () => {
    const content = `---
"my-pkg": minor
---

Added a new feature`;
    const result = parseChangesetContent(content);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].packageName).toBe("my-pkg");
    expect(result.entries[0].bump).toBe("minor");
    expect(result.summary).toBe("Added a new feature");
  });

  it("parseChangesetContent handles multiple packages", () => {
    const content = `---
"pkg-a": major
"pkg-b": patch
---

Breaking change in pkg-a, fix in pkg-b`;
    const result = parseChangesetContent(content);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].packageName).toBe("pkg-a");
    expect(result.entries[0].bump).toBe("major");
    expect(result.entries[1].packageName).toBe("pkg-b");
    expect(result.entries[1].bump).toBe("patch");
  });

  it("parseChangesetContent accepts id parameter", () => {
    const content = '---\n"my-pkg": minor\n---\n\nAdded new feature\n';
    const result = parseChangesetContent(content, "test-id");
    expect(result.id).toBe("test-id");
  });

  it("parseChangesetContent handles empty summary", () => {
    const content = '---\n"pkg": patch\n---\n';
    const result = parseChangesetContent(content);
    expect(result.summary).toBe("");
  });

  it("parseChangesetContent throws on malformed content", () => {
    expect(() => parseChangesetContent("no frontmatter", "bad")).toThrow();
  });

  it("parseChangeset reads from file", async () => {
    tmpDir = join(tmpdir(), `tspub-cs-parse-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    const filePath = join(tmpDir, "test.md");
    await writeFile(filePath, `---\n"my-pkg": patch\n---\n\nFix bug`);
    const result = await parseChangeset(filePath);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].bump).toBe("patch");
    expect(result.summary).toBe("Fix bug");
    expect(result.id).toBe("test");
  });
});
