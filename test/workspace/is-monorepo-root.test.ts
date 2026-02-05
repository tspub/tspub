import { describe, it, expect, afterEach } from "vitest";
import { isMonorepoRoot } from "../../src/workspace/index.js";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(__dirname, "../fixtures");

describe("workspace: isMonorepoRoot", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns true for monorepo fixture", async () => {
    expect(await isMonorepoRoot(join(fixturesDir, "monorepo"))).toBe(true);
  });

  it("returns false for simple-pkg (no workspaces field)", async () => {
    expect(await isMonorepoRoot(join(fixturesDir, "simple-pkg"))).toBe(false);
  });

  it("returns false for nonexistent directory", async () => {
    expect(await isMonorepoRoot("/nonexistent/path/that/does/not/exist")).toBe(false);
  });

  it("detects pnpm-workspace.yaml", async () => {
    tmpDir = join(tmpdir(), `tspub-ws-pnpm-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({ name: "root", private: true }));
    await writeFile(join(tmpDir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n");
    expect(await isMonorepoRoot(tmpDir)).toBe(true);
  });
});
