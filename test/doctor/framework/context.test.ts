import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { buildDoctorContext } from "../../../src/doctor/framework/context.js";
import type { PackageJson } from "../../../src/shared/package-json.js";

describe("buildDoctorContext", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      "/tmp",
      `tspub-test-context-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("builds context with pkg and dir", async () => {
    const pkg: PackageJson = { name: "test-pkg", version: "1.0.0" };
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.pkg).toBe(pkg);
    expect(ctx.dir).toBe(tempDir);
  });

  it("detects no build output when directories don't exist", async () => {
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.hasBuildOutput).toBe(false);
  });

  it("detects build output when dist exists", async () => {
    await mkdir(join(tempDir, "dist"));
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.hasBuildOutput).toBe(true);
  });

  it("detects build output when lib exists", async () => {
    await mkdir(join(tempDir, "lib"));
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.hasBuildOutput).toBe(true);
  });

  it("detects build output when build exists", async () => {
    await mkdir(join(tempDir, "build"));
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.hasBuildOutput).toBe(true);
  });

  it("detects build output when out exists", async () => {
    await mkdir(join(tempDir, "out"));
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.hasBuildOutput).toBe(true);
  });

  it("finds package-lock.json", async () => {
    await writeFile(join(tempDir, "package-lock.json"), "{}");
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.lockFiles).toContain("package-lock.json");
  });

  it("finds yarn.lock", async () => {
    await writeFile(join(tempDir, "yarn.lock"), "");
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.lockFiles).toContain("yarn.lock");
  });

  it("finds pnpm-lock.yaml", async () => {
    await writeFile(join(tempDir, "pnpm-lock.yaml"), "");
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.lockFiles).toContain("pnpm-lock.yaml");
  });

  it("finds bun.lockb", async () => {
    await writeFile(join(tempDir, "bun.lockb"), "");
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.lockFiles).toContain("bun.lockb");
  });

  it("finds multiple lock files", async () => {
    await writeFile(join(tempDir, "package-lock.json"), "{}");
    await writeFile(join(tempDir, "yarn.lock"), "");
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.lockFiles).toHaveLength(2);
    expect(ctx.lockFiles).toContain("package-lock.json");
    expect(ctx.lockFiles).toContain("yarn.lock");
  });

  it("returns null compilerOptions when no tsconfig.json", async () => {
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.compilerOptions).toBeNull();
  });

  it("reads compilerOptions from tsconfig.json", async () => {
    const tsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "Node16",
        strict: true,
      },
    };
    await writeFile(join(tempDir, "tsconfig.json"), JSON.stringify(tsconfig));
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.compilerOptions).not.toBeNull();
    expect(ctx.compilerOptions?.["target"]).toBe("ES2022");
    expect(ctx.compilerOptions?.["module"]).toBe("Node16");
    expect(ctx.compilerOptions?.["strict"]).toBe(true);
  });

  it("handles tsconfig.json with comments", async () => {
    const tsconfigWithComments = `{
  // This is a comment
  "compilerOptions": {
    "strict": true, // Enable strict mode
    "declaration": true
  }
}`;
    await writeFile(join(tempDir, "tsconfig.json"), tsconfigWithComments);
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.compilerOptions).not.toBeNull();
    expect(ctx.compilerOptions?.["strict"]).toBe(true);
    expect(ctx.compilerOptions?.["declaration"]).toBe(true);
  });

  it("handles tsconfig.json with extends", async () => {
    const baseConfig = {
      compilerOptions: {
        strict: true,
        target: "ES2022",
      },
    };
    await writeFile(join(tempDir, "tsconfig.base.json"), JSON.stringify(baseConfig));

    const extendingConfig = {
      extends: "./tsconfig.base.json",
      compilerOptions: {
        outDir: "dist",
      },
    };
    await writeFile(join(tempDir, "tsconfig.json"), JSON.stringify(extendingConfig));

    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.compilerOptions).not.toBeNull();
    expect(ctx.compilerOptions?.["strict"]).toBe(true);
    expect(ctx.compilerOptions?.["target"]).toBe("ES2022");
    expect(ctx.compilerOptions?.["outDir"]).toBe("dist");
  });

  it("lists dist files when dist exists", async () => {
    await mkdir(join(tempDir, "dist"), { recursive: true });
    await writeFile(join(tempDir, "dist", "index.js"), "");
    await writeFile(join(tempDir, "dist", "index.d.ts"), "");

    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.distFiles.length).toBeGreaterThan(0);
  });

  it("uses custom outDir from compilerOptions", async () => {
    const tsconfig = {
      compilerOptions: {
        outDir: "build",
      },
    };
    await writeFile(join(tempDir, "tsconfig.json"), JSON.stringify(tsconfig));
    await mkdir(join(tempDir, "build"), { recursive: true });
    await writeFile(join(tempDir, "build", "index.js"), "");

    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.distFiles.length).toBeGreaterThan(0);
  });

  it("returns empty distFiles when dist directory is empty", async () => {
    await mkdir(join(tempDir, "dist"));
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    expect(ctx.distFiles).toEqual([]);
  });

  it("handles invalid tsconfig.json gracefully", async () => {
    await writeFile(join(tempDir, "tsconfig.json"), "invalid json");
    const pkg: PackageJson = {};
    const ctx = await buildDoctorContext(pkg, tempDir);

    // Invalid JSON results in empty merged compilerOptions
    expect(ctx.compilerOptions).toEqual({});
  });
});
