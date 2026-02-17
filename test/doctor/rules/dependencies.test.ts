import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  fileDependencyRule,
  duplicateDependencyRule,
  missingPeerDepRule,
} from "../../../src/doctor/rules/dependencies.js";
import type { DoctorContext, DoctorFixContext } from "../../../src/doctor/framework/types.js";
import type { PackageJson } from "../../../src/shared/package-json.js";

function buildContext(overrides: Partial<DoctorContext> = {}): DoctorContext {
  return {
    pkg: {},
    dir: "/tmp/test",
    compilerOptions: null,
    hasBuildOutput: false,
    distFiles: [],
    lockFiles: [],
    ...overrides,
  };
}

function buildFixContext(dir: string, pkg: PackageJson): DoctorFixContext {
  return { pkg, dir };
}

describe("dependency rules", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      "/tmp",
      `tspub-test-deps-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("fileDependencyRule", () => {
    it("returns empty array when no dependencies", async () => {
      const ctx = buildContext({ pkg: {} });
      const result = await fileDependencyRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("warns on file: protocol in dependencies", async () => {
      const ctx = buildContext({
        pkg: {
          dependencies: {
            "local-pkg": "file:../local-pkg",
          },
        },
      });
      const result = await fileDependencyRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("local-pkg");
      expect(result[0]?.message).toContain("file:");
    });

    it("passes on normal dependencies", async () => {
      const ctx = buildContext({
        pkg: {
          dependencies: {
            react: "^18.0.0",
            lodash: "^4.17.21",
          },
        },
      });
      const result = await fileDependencyRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("warns on multiple file: dependencies", async () => {
      const ctx = buildContext({
        pkg: {
          dependencies: {
            "local-pkg1": "file:../pkg1",
            "local-pkg2": "file:../pkg2",
            react: "^18.0.0",
          },
        },
      });
      const result = await fileDependencyRule.check(ctx);
      expect(result).toHaveLength(2);
      expect(result[0]?.severity).toBe("warning");
      expect(result[1]?.severity).toBe("warning");
    });
  });

  describe("duplicateDependencyRule", () => {
    it("returns empty array when no duplicates", async () => {
      const ctx = buildContext({
        pkg: {
          dependencies: { react: "^18.0.0" },
          devDependencies: { vitest: "^1.0.0" },
        },
      });
      const result = await duplicateDependencyRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("warns on duplicate packages", async () => {
      const ctx = buildContext({
        pkg: {
          dependencies: { react: "^18.0.0", lodash: "^4.17.21" },
          devDependencies: { react: "^18.0.0", vitest: "^1.0.0" },
        },
      });
      const result = await duplicateDependencyRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("react");
      expect(result[0]?.message).toContain("both");
    });

    it("fix removes duplicates from devDependencies", async () => {
      const pkg: PackageJson = {
        dependencies: { react: "^18.0.0" },
        devDependencies: { react: "^18.0.0", vitest: "^1.0.0" },
      };
      const fixCtx = buildFixContext(tempDir, pkg);
      const fixResult = await duplicateDependencyRule.fix!(fixCtx);

      expect(fixResult.pkgModified).toBe(true);
      expect(fixResult.message).toContain("react");
      expect(fixResult.message).toContain("devDependencies");
      expect(pkg.devDependencies).toEqual({ vitest: "^1.0.0" });
      expect(pkg.dependencies).toEqual({ react: "^18.0.0" });
    });

    it("fix handles multiple duplicates", async () => {
      const pkg: PackageJson = {
        dependencies: { react: "^18.0.0", lodash: "^4.17.21" },
        devDependencies: { react: "^18.0.0", lodash: "^4.17.21", vitest: "^1.0.0" },
      };
      const fixCtx = buildFixContext(tempDir, pkg);
      const fixResult = await duplicateDependencyRule.fix!(fixCtx);

      expect(fixResult.pkgModified).toBe(true);
      expect(pkg.devDependencies).toEqual({ vitest: "^1.0.0" });
      expect(pkg.dependencies).toEqual({ react: "^18.0.0", lodash: "^4.17.21" });
    });

    it("fix returns empty when no duplicates", async () => {
      const pkg: PackageJson = {
        dependencies: { react: "^18.0.0" },
        devDependencies: { vitest: "^1.0.0" },
      };
      const fixCtx = buildFixContext(tempDir, pkg);
      const fixResult = await duplicateDependencyRule.fix!(fixCtx);

      expect(fixResult.pkgModified).toBe(false);
      expect(fixResult.message).toBe("");
    });
  });

  describe("missingPeerDepRule", () => {
    it("returns empty array when no peerDependencies", async () => {
      const ctx = buildContext({ pkg: {} });
      const result = await missingPeerDepRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("returns empty array when peer deps are installed", async () => {
      const ctx = buildContext({
        pkg: {
          peerDependencies: { react: "^18.0.0" },
          dependencies: { react: "^18.0.0" },
        },
      });
      const result = await missingPeerDepRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("returns empty array when peer deps are in devDependencies", async () => {
      const ctx = buildContext({
        pkg: {
          peerDependencies: { react: "^18.0.0" },
          devDependencies: { react: "^18.0.0" },
        },
      });
      const result = await missingPeerDepRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("warns when peer dependency is not installed", async () => {
      const ctx = buildContext({
        pkg: {
          peerDependencies: { react: "^18.0.0" },
          dependencies: {},
          devDependencies: {},
        },
      });
      const result = await missingPeerDepRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("react");
      expect(result[0]?.message).toContain("not installed");
    });

    it("warns for multiple missing peer dependencies", async () => {
      const ctx = buildContext({
        pkg: {
          peerDependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
          dependencies: {},
        },
      });
      const result = await missingPeerDepRule.check(ctx);
      expect(result).toHaveLength(2);
      expect(result[0]?.severity).toBe("warning");
      expect(result[1]?.severity).toBe("warning");
    });

    it("only warns for missing peer deps, not installed ones", async () => {
      const ctx = buildContext({
        pkg: {
          peerDependencies: { react: "^18.0.0", "react-dom": "^18.0.0" },
          dependencies: { react: "^18.0.0" },
        },
      });
      const result = await missingPeerDepRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.message).toContain("react-dom");
    });
  });
});
