import { describe, it, expect, afterEach } from "vitest";
import { createSnapshot } from "../../src/changeset/snapshot.js";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("changeset: createSnapshot", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it("uses custom tag in snapshot version", async () => {
    tmpDir = join(tmpdir(), `tspub-cs-snap-tag-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "test-pkg", version: "1.0.0" }));
    await writeFile(join(tmpDir, ".changeset/a.md"), '---\n"test-pkg": minor\n---\n\nFeature');
    const versions = await createSnapshot(tmpDir, "beta");
    expect(versions[0]!).toMatch(/^test-pkg@0\.0\.0-beta-\d+$/);
  });
});
