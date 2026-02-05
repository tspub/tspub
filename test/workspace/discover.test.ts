import { describe, it, expect, afterEach } from "vitest";
import { discoverWorkspaces, topoSort } from "../../src/workspace/index.js";
import { rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixturesDir = join(__dirname, "../fixtures");

describe("workspace: discoverWorkspaces comprehensive", () => {
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it("discovers packages with correct localDeps", async () => {
    const packages = await discoverWorkspaces(join(fixturesDir, "monorepo"));
    const utils = packages.find((p) => p.name === "@monorepo/utils")!;
    expect(utils.localDeps).toContain("@monorepo/core");
    const core = packages.find((p) => p.name === "@monorepo/core")!;
    expect(core.localDeps).toHaveLength(0);
  });

  it("handles empty workspaces", async () => {
    tmpDir = join(tmpdir(), `tspub-ws-empty-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "package.json"), JSON.stringify({
      name: "empty-mono", private: true, workspaces: ["packages/*"],
    }));
    await mkdir(join(tmpDir, "packages"), { recursive: true });

    const packages = await discoverWorkspaces(tmpDir);
    expect(packages).toHaveLength(0);
  });

  it("handles three-level dependency chain", async () => {
    tmpDir = join(tmpdir(), `tspub-ws-chain-${Date.now()}`);
    await mkdir(join(tmpDir, "packages/a/src"), { recursive: true });
    await mkdir(join(tmpDir, "packages/b/src"), { recursive: true });
    await mkdir(join(tmpDir, "packages/c/src"), { recursive: true });

    await writeFile(join(tmpDir, "package.json"), JSON.stringify({
      name: "chain-mono", private: true, workspaces: ["packages/*"],
    }));
    await writeFile(join(tmpDir, "packages/a/package.json"), JSON.stringify({
      name: "@chain/a", version: "1.0.0",
    }));
    await writeFile(join(tmpDir, "packages/b/package.json"), JSON.stringify({
      name: "@chain/b", version: "1.0.0",
      dependencies: { "@chain/a": "workspace:*" },
    }));
    await writeFile(join(tmpDir, "packages/c/package.json"), JSON.stringify({
      name: "@chain/c", version: "1.0.0",
      dependencies: { "@chain/b": "workspace:*" },
    }));

    const packages = await discoverWorkspaces(tmpDir);
    expect(packages).toHaveLength(3);

    const sorted = topoSort(packages);
    const aIdx = sorted.findIndex((p) => p.name === "@chain/a");
    const bIdx = sorted.findIndex((p) => p.name === "@chain/b");
    const cIdx = sorted.findIndex((p) => p.name === "@chain/c");
    expect(aIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(cIdx);
  });
});
