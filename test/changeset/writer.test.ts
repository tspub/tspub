import { describe, it, expect, afterEach } from "vitest";
import { parseChangeset } from "../../src/changeset/parser.js";
import { writeChangeset } from "../../src/changeset/writer.js";
import { rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("changeset: writer", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it("writeChangeset creates a .md file in .changeset/", async () => {
    tmpDir = join(tmpdir(), `tspub-cs-write-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, ".changeset/README.md"), "# Changesets");

    const filePath = await writeChangeset(
      tmpDir,
      [{ packageName: "my-pkg", bump: "minor" }],
      "Added feature X",
    );

    expect(filePath).toMatch(/\.changeset\/.*\.md$/);
    const content = await readFile(filePath, "utf-8");
    expect(content).toContain("my-pkg");
    expect(content).toContain("minor");
    expect(content).toContain("Added feature X");
  });

  it("generates unique IDs for multiple changesets", async () => {
    tmpDir = join(tmpdir(), `tspub-cs-unique-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });

    const p1 = await writeChangeset(tmpDir, [{ packageName: "pkg", bump: "patch" }], "Fix 1");
    const p2 = await writeChangeset(tmpDir, [{ packageName: "pkg", bump: "patch" }], "Fix 2");
    expect(p1).not.toBe(p2);
  });

  it("written changeset is parseable", async () => {
    tmpDir = join(tmpdir(), `tspub-cs-roundtrip-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, ".changeset/README.md"), "# Changesets");

    const filePath = await writeChangeset(
      tmpDir,
      [
        { packageName: "core", bump: "major" },
        { packageName: "utils", bump: "patch" },
      ],
      "Big rewrite",
    );

    const parsed = await parseChangeset(filePath);
    expect(parsed.entries).toHaveLength(2);
    const core = parsed.entries.find((e) => e.packageName === "core");
    const utils = parsed.entries.find((e) => e.packageName === "utils");
    expect(core!.bump).toBe("major");
    expect(utils!.bump).toBe("patch");
    expect(parsed.summary).toBe("Big rewrite");
  });
});
