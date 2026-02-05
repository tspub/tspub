import { describe, it, expect, afterEach } from "vitest";
import { scaffold } from "../../src/scaffold/index.js";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("tspub init", () => {
  const testDir = join(tmpdir(), "tspub-test-init-" + Date.now());

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("scaffolds an ESM-only package", async () => {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(testDir, { recursive: true });

    await scaffold({
      name: "test-pkg",
      dualPublish: false,
      react: false,
      monorepo: false,
      dir: testDir,
    });

    const pkgJson = JSON.parse(
      await readFile(join(testDir, "test-pkg", "package.json"), "utf-8"),
    );
    expect(pkgJson.name).toBe("test-pkg");
    expect(pkgJson.type).toBe("module");
    expect(pkgJson.exports["."]).toBeDefined();
    expect(pkgJson.exports["."].import.types).toBe("./dist/index.d.ts");
    expect(pkgJson.files).toEqual(["dist"]);

    const indexTs = await readFile(
      join(testDir, "test-pkg", "src", "index.ts"),
      "utf-8",
    );
    expect(indexTs).toContain("export function");

    const tsconfig = JSON.parse(
      await readFile(join(testDir, "test-pkg", "tsconfig.json"), "utf-8"),
    );
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.module).toBe("NodeNext");
  });

  it("scaffolds a dual-publish package", async () => {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(testDir, { recursive: true });

    await scaffold({
      name: "dual-pkg",
      dualPublish: true,
      react: false,
      monorepo: false,
      dir: testDir,
    });

    const pkgJson = JSON.parse(
      await readFile(join(testDir, "dual-pkg", "package.json"), "utf-8"),
    );
    expect(pkgJson.exports["."].require).toBeDefined();
    expect(pkgJson.exports["."].require.types).toBe("./dist/index.d.cts");
  });

  it("scaffolds a React package", async () => {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(testDir, { recursive: true });

    await scaffold({
      name: "react-pkg",
      dualPublish: false,
      react: true,
      monorepo: false,
      dir: testDir,
    });

    const pkgJson = JSON.parse(
      await readFile(join(testDir, "react-pkg", "package.json"), "utf-8"),
    );
    expect(pkgJson.peerDependencies.react).toBeDefined();

    const tsconfig = JSON.parse(
      await readFile(join(testDir, "react-pkg", "tsconfig.json"), "utf-8"),
    );
    expect(tsconfig.compilerOptions.jsx).toBe("react-jsx");
  });
});
