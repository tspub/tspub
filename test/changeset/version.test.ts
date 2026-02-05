import { describe, it, expect, afterEach } from "vitest";
import { consumeChangesets } from "../../src/changeset/version.js";
import { rm, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("changeset: consumeChangesets edge cases", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns empty updates when no changeset files exist", async () => {
    tmpDir = join(tmpdir(), `tspub-cs-empty-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, ".changeset/README.md"), "# Changesets");
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }));

    const result = await consumeChangesets(tmpDir);
    expect(result.updates).toHaveLength(0);
  });

  it("cleanup deletes consumed changeset files", async () => {
    tmpDir = join(tmpdir(), `tspub-cs-cleanup-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "test-pkg", version: "1.0.0" }));
    await writeFile(join(tmpDir, ".changeset/x.md"), '---\n"test-pkg": patch\n---\n\nFix');
    const { cleanup } = await consumeChangesets(tmpDir);
    const before = (await readdir(join(tmpDir, ".changeset"))).filter(f => f.endsWith(".md") && f !== "README.md");
    expect(before).toHaveLength(1);
    await cleanup();
    const after = (await readdir(join(tmpDir, ".changeset"))).filter(f => f.endsWith(".md") && f !== "README.md");
    expect(after).toHaveLength(0);
  });

  it("creates changelog on consume", async () => {
    tmpDir = join(tmpdir(), `tspub-cs-changelog-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "test-pkg", version: "1.0.0" }));
    await writeFile(join(tmpDir, ".changeset/y.md"), '---\n"test-pkg": patch\n---\n\nFixed bug');
    const { cleanup } = await consumeChangesets(tmpDir);
    const changelog = await readFile(join(tmpDir, "CHANGELOG.md"), "utf-8");
    expect(changelog).toContain("1.0.1");
    expect(changelog).toContain("Fixed bug");
    await cleanup();
  });

  it("highest bump wins when multiple changesets bump same package", async () => {
    tmpDir = join(tmpdir(), `tspub-cs-multi-${Date.now()}`);
    await mkdir(join(tmpDir, ".changeset"), { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "my-lib", version: "2.0.0" }));
    await writeFile(join(tmpDir, ".changeset/README.md"), "# Changesets");
    await writeFile(join(tmpDir, ".changeset/fix-a.md"), '---\n"my-lib": patch\n---\n\nFix A');
    await writeFile(join(tmpDir, ".changeset/feat-b.md"), '---\n"my-lib": minor\n---\n\nFeat B');

    const result = await consumeChangesets(tmpDir);
    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].bump).toBe("minor");
    expect(result.updates[0].newVersion).toBe("2.1.0");
  });
});
