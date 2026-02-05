import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import {
  discoverWorkspaces,
  topoSort,
  isMonorepoRoot,
} from "../../src/workspace/index.js";

const tmpDir = join(import.meta.dirname, "..", ".tmp-workspace-cli-test");

async function writePkg(dir: string, pkg: Record<string, unknown>): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "package.json"), JSON.stringify(pkg, null, 2));
}

beforeEach(async () => {
  await mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("workspace CLI integration", () => {
  it("topo-sorts a diamond dependency graph", async () => {
    await writePkg(tmpDir, {
      name: "root",
      private: true,
      workspaces: ["packages/*"],
    });

    // Diamond: A -> B, A -> C, B -> D, C -> D
    await writePkg(join(tmpDir, "packages", "d"), {
      name: "d",
      version: "1.0.0",
    });
    await writePkg(join(tmpDir, "packages", "b"), {
      name: "b",
      version: "1.0.0",
      dependencies: { d: "workspace:*" },
    });
    await writePkg(join(tmpDir, "packages", "c"), {
      name: "c",
      version: "1.0.0",
      dependencies: { d: "workspace:*" },
    });
    await writePkg(join(tmpDir, "packages", "a"), {
      name: "a",
      version: "1.0.0",
      dependencies: { b: "workspace:*", c: "workspace:*" },
    });

    const packages = await discoverWorkspaces(tmpDir);
    const sorted = topoSort(packages);
    const names = sorted.map((p) => p.name);

    // d must come before b and c, b and c must come before a
    expect(names.indexOf("d")).toBeLessThan(names.indexOf("b"));
    expect(names.indexOf("d")).toBeLessThan(names.indexOf("c"));
    expect(names.indexOf("b")).toBeLessThan(names.indexOf("a"));
    expect(names.indexOf("c")).toBeLessThan(names.indexOf("a"));
  });

  it("handles yarn-style workspaces object", async () => {
    await writePkg(tmpDir, {
      name: "root",
      private: true,
      workspaces: { packages: ["packages/*"] },
    });
    await writePkg(join(tmpDir, "packages", "x"), {
      name: "x",
      version: "1.0.0",
    });

    expect(await isMonorepoRoot(tmpDir)).toBe(true);
    const packages = await discoverWorkspaces(tmpDir);
    expect(packages).toHaveLength(1);
    expect(packages[0]!.name).toBe("x");
  });

  it("ignores directories without package.json", async () => {
    await writePkg(tmpDir, {
      name: "root",
      private: true,
      workspaces: ["packages/*"],
    });
    await mkdir(join(tmpDir, "packages", "no-pkg"), { recursive: true });
    // No package.json in no-pkg

    const packages = await discoverWorkspaces(tmpDir);
    expect(packages).toHaveLength(0);
  });

  it("resolves devDependencies as local deps", async () => {
    await writePkg(tmpDir, {
      name: "root",
      private: true,
      workspaces: ["packages/*"],
    });
    await writePkg(join(tmpDir, "packages", "lib"), {
      name: "lib",
      version: "1.0.0",
    });
    await writePkg(join(tmpDir, "packages", "app"), {
      name: "app",
      version: "1.0.0",
      devDependencies: { lib: "workspace:*" },
    });

    const packages = await discoverWorkspaces(tmpDir);
    const app = packages.find((p) => p.name === "app")!;
    expect(app.localDeps).toContain("lib");
  });
});
