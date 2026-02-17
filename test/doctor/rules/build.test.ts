import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  buildOutputRule,
  buildOutputFreshRule,
} from "../../../src/doctor/rules/build.js";
import type { DoctorContext } from "../../../src/doctor/framework/types.js";

function buildContext(
  dir: string,
  overrides: Partial<DoctorContext> = {},
): DoctorContext {
  return {
    pkg: {},
    dir,
    compilerOptions: null,
    hasBuildOutput: false,
    distFiles: [],
    lockFiles: [],
    ...overrides,
  };
}

describe("build rules", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      "/tmp",
      `tspub-test-build-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("buildOutputRule", () => {
    it("warns when no build output directory exists", async () => {
      const ctx = buildContext(tempDir, { hasBuildOutput: false });
      const result = await buildOutputRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("No build output");
    });

    it("passes when dist directory exists", async () => {
      await mkdir(join(tempDir, "dist"));
      const ctx = buildContext(tempDir, { hasBuildOutput: true });
      const result = await buildOutputRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("passes when lib directory exists", async () => {
      await mkdir(join(tempDir, "lib"));
      const ctx = buildContext(tempDir, { hasBuildOutput: true });
      const result = await buildOutputRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("passes when build directory exists", async () => {
      await mkdir(join(tempDir, "build"));
      const ctx = buildContext(tempDir, { hasBuildOutput: true });
      const result = await buildOutputRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("passes when out directory exists", async () => {
      await mkdir(join(tempDir, "out"));
      const ctx = buildContext(tempDir, { hasBuildOutput: true });
      const result = await buildOutputRule.check(ctx);
      expect(result).toEqual([]);
    });
  });

  describe("buildOutputFreshRule", () => {
    it("returns empty array when no build output", async () => {
      const ctx = buildContext(tempDir, { hasBuildOutput: false });
      const result = await buildOutputFreshRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("returns empty array when dist is newer than src", async () => {
      await mkdir(join(tempDir, "src"), { recursive: true });
      await mkdir(join(tempDir, "dist"), { recursive: true });

      // Create src file
      const srcFile = join(tempDir, "src", "index.ts");
      await writeFile(srcFile, "export const foo = 1;");

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create dist file with newer timestamp
      const distFile = join(tempDir, "dist", "index.js");
      await writeFile(distFile, "export const foo = 1;");

      const ctx = buildContext(tempDir, {
        hasBuildOutput: true,
        compilerOptions: { outDir: "dist" },
      });
      const result = await buildOutputFreshRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("warns when src is newer than dist", async () => {
      await mkdir(join(tempDir, "src"), { recursive: true });
      await mkdir(join(tempDir, "dist"), { recursive: true });

      // Create dist file first
      const distFile = join(tempDir, "dist", "index.js");
      await writeFile(distFile, "export const foo = 1;");

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create src file with newer timestamp
      const srcFile = join(tempDir, "src", "index.ts");
      await writeFile(srcFile, "export const foo = 1;");

      const ctx = buildContext(tempDir, {
        hasBuildOutput: true,
        compilerOptions: { outDir: "dist" },
      });
      const result = await buildOutputFreshRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("stale");
    });

    it("uses custom outDir from compilerOptions", async () => {
      await mkdir(join(tempDir, "src"), { recursive: true });
      await mkdir(join(tempDir, "build"), { recursive: true });

      // Create build file first
      const buildFile = join(tempDir, "build", "index.js");
      await writeFile(buildFile, "export const foo = 1;");

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create src file with newer timestamp
      const srcFile = join(tempDir, "src", "index.ts");
      await writeFile(srcFile, "export const foo = 1;");

      const ctx = buildContext(tempDir, {
        hasBuildOutput: true,
        compilerOptions: { outDir: "build" },
      });
      const result = await buildOutputFreshRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.message).toContain("build");
    });

    it("handles missing src directory gracefully", async () => {
      await mkdir(join(tempDir, "dist"), { recursive: true });

      const ctx = buildContext(tempDir, {
        hasBuildOutput: true,
        compilerOptions: { outDir: "dist" },
      });
      const result = await buildOutputFreshRule.check(ctx);
      expect(result).toEqual([]);
    });
  });
});
