import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  tsconfigExistsRule,
  tsconfigStrictRule,
  tsconfigDeclarationRule,
  tsconfigModuleRule,
  tsconfigModuleResolutionRule,
} from "../../../src/doctor/rules/typescript.js";
import type { DoctorContext, DoctorFixContext } from "../../../src/doctor/framework/types.js";
import type { PackageJson } from "../../../src/shared/package-json.js";
import { readFile } from "node:fs/promises";

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

function buildFixContext(dir: string, pkg: PackageJson = {}): DoctorFixContext {
  return { pkg, dir };
}

describe("typescript rules", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      "/tmp",
      `tspub-test-typescript-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("tsconfigExistsRule", () => {
    it("returns error when no tsconfig.json exists", async () => {
      const ctx = buildContext(tempDir);
      const result = await tsconfigExistsRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("error");
      expect(result[0]?.message).toContain("No tsconfig.json");
    });

    it("returns empty array when tsconfig.json exists", async () => {
      await writeFile(join(tempDir, "tsconfig.json"), "{}");
      const ctx = buildContext(tempDir);
      const result = await tsconfigExistsRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("fix creates tsconfig.json", async () => {
      const fixCtx = buildFixContext(tempDir);
      const fixResult = await tsconfigExistsRule.fix!(fixCtx);
      expect(fixResult.message).toContain("Created");
      expect(fixResult.pkgModified).toBe(false);

      const content = await readFile(join(tempDir, "tsconfig.json"), "utf-8");
      const tsconfig = JSON.parse(content);
      expect(tsconfig.compilerOptions).toBeDefined();
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.declaration).toBe(true);
    });
  });

  describe("tsconfigStrictRule", () => {
    it("returns empty array when no compilerOptions", async () => {
      const ctx = buildContext(tempDir, { compilerOptions: null });
      const result = await tsconfigStrictRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("warns when strict is not enabled", async () => {
      const ctx = buildContext(tempDir, {
        compilerOptions: { strict: false },
      });
      const result = await tsconfigStrictRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("strict");
    });

    it("returns empty array when strict is enabled", async () => {
      const ctx = buildContext(tempDir, {
        compilerOptions: { strict: true },
      });
      const result = await tsconfigStrictRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("fix sets strict to true", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: {} }, null, 2),
      );
      const fixCtx = buildFixContext(tempDir);
      const fixResult = await tsconfigStrictRule.fix!(fixCtx);
      expect(fixResult.message).toContain("strict");
      expect(fixResult.pkgModified).toBe(false);

      const content = await readFile(join(tempDir, "tsconfig.json"), "utf-8");
      const tsconfig = JSON.parse(content);
      expect(tsconfig.compilerOptions.strict).toBe(true);
    });
  });

  describe("tsconfigDeclarationRule", () => {
    it("returns empty array when no compilerOptions", async () => {
      const ctx = buildContext(tempDir, { compilerOptions: null });
      const result = await tsconfigDeclarationRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("warns when declaration is not enabled", async () => {
      const ctx = buildContext(tempDir, {
        compilerOptions: { declaration: false },
      });
      const result = await tsconfigDeclarationRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("declaration");
    });

    it("returns empty array when declaration is enabled", async () => {
      const ctx = buildContext(tempDir, {
        compilerOptions: { declaration: true },
      });
      const result = await tsconfigDeclarationRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("fix sets declaration to true", async () => {
      await writeFile(
        join(tempDir, "tsconfig.json"),
        JSON.stringify({ compilerOptions: {} }, null, 2),
      );
      const fixCtx = buildFixContext(tempDir);
      const fixResult = await tsconfigDeclarationRule.fix!(fixCtx);
      expect(fixResult.message).toContain("declaration");
      expect(fixResult.pkgModified).toBe(false);

      const content = await readFile(join(tempDir, "tsconfig.json"), "utf-8");
      const tsconfig = JSON.parse(content);
      expect(tsconfig.compilerOptions.declaration).toBe(true);
    });
  });

  describe("tsconfigModuleRule", () => {
    it("returns empty array when no compilerOptions", async () => {
      const ctx = buildContext(tempDir, { compilerOptions: null });
      const result = await tsconfigModuleRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("returns info when module is not set", async () => {
      const ctx = buildContext(tempDir, { compilerOptions: {} });
      const result = await tsconfigModuleRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("info");
      expect(result[0]?.message).toContain("module");
    });

    it("returns empty array when module is set", async () => {
      const ctx = buildContext(tempDir, {
        compilerOptions: { module: "Node16" },
      });
      const result = await tsconfigModuleRule.check(ctx);
      expect(result).toEqual([]);
    });
  });

  describe("tsconfigModuleResolutionRule", () => {
    it("returns empty array when no compilerOptions", async () => {
      const ctx = buildContext(tempDir, { compilerOptions: null });
      const result = await tsconfigModuleResolutionRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("returns info when moduleResolution is not set", async () => {
      const ctx = buildContext(tempDir, { compilerOptions: {} });
      const result = await tsconfigModuleResolutionRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("info");
      expect(result[0]?.message).toContain("moduleResolution");
    });

    it("warns on legacy 'node' moduleResolution", async () => {
      const ctx = buildContext(tempDir, {
        compilerOptions: { moduleResolution: "node" },
      });
      const result = await tsconfigModuleResolutionRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("legacy");
    });

    it("warns on legacy 'classic' moduleResolution", async () => {
      const ctx = buildContext(tempDir, {
        compilerOptions: { moduleResolution: "classic" },
      });
      const result = await tsconfigModuleResolutionRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("legacy");
    });

    it("returns empty array for modern moduleResolution", async () => {
      const ctx = buildContext(tempDir, {
        compilerOptions: { moduleResolution: "Node16" },
      });
      const result = await tsconfigModuleResolutionRule.check(ctx);
      expect(result).toEqual([]);
    });
  });
});
