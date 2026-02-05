import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  nodeVersionRule,
  npmVersionRule,
  packageManagerRule,
  typescriptVersionRule,
  gitStatusRule,
  gitRemoteRule,
} from "../../../src/doctor/rules/environment.js";
import type { DoctorContext } from "../../../src/doctor/framework/types.js";
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

describe("environment rules", () => {
  describe("nodeVersionRule", () => {
    it("returns empty array when no engines.node specified", async () => {
      const ctx = buildContext({ pkg: {} });
      const result = await nodeVersionRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("returns empty array when current version satisfies requirement", async () => {
      const ctx = buildContext({
        pkg: { engines: { node: ">=14" } },
      });
      const result = await nodeVersionRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("returns error when current version does not satisfy requirement", async () => {
      const ctx = buildContext({
        pkg: { engines: { node: ">=999.0.0" } },
      });
      const result = await nodeVersionRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("error");
      expect(result[0]?.message).toContain("does not satisfy");
    });

    it("handles version without minor number", async () => {
      const ctx = buildContext({
        pkg: { engines: { node: ">=14" } },
      });
      const result = await nodeVersionRule.check(ctx);
      expect(result).toEqual([]);
    });
  });

  describe("npmVersionRule", () => {
    it("returns info with npm version string", async () => {
      const ctx = buildContext();
      const result = await npmVersionRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("info");
      expect(result[0]?.message).toMatch(/npm version:/);
    });
  });

  describe("packageManagerRule", () => {
    it("returns empty array when single lock file", async () => {
      const ctx = buildContext({ lockFiles: ["package-lock.json"] });
      const result = await packageManagerRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("returns empty array when no lock files", async () => {
      const ctx = buildContext({ lockFiles: [] });
      const result = await packageManagerRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("warns when multiple lock files present", async () => {
      const ctx = buildContext({
        lockFiles: ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"],
      });
      const result = await packageManagerRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("Multiple lock files");
      expect(result[0]?.message).toContain("package-lock.json");
      expect(result[0]?.message).toContain("yarn.lock");
    });
  });

  describe("typescriptVersionRule", () => {
    it("returns empty array when no typescript in dependencies", async () => {
      const ctx = buildContext({ pkg: {} });
      const result = await typescriptVersionRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("returns empty array when typescript version is empty devDeps", async () => {
      const ctx = buildContext({ pkg: { devDependencies: {} } });
      const result = await typescriptVersionRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("warns when typescript 4.x is used", async () => {
      const ctx = buildContext({
        pkg: { devDependencies: { typescript: "^4.9.5" } },
      });
      const result = await typescriptVersionRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
      expect(result[0]?.message).toContain("outdated");
      expect(result[0]?.message).toContain("5.x");
    });

    it("passes when typescript 5.x is used", async () => {
      const ctx = buildContext({
        pkg: { devDependencies: { typescript: "^5.0.0" } },
      });
      const result = await typescriptVersionRule.check(ctx);
      expect(result).toEqual([]);
    });

    it("checks dependencies if not in devDependencies", async () => {
      const ctx = buildContext({
        pkg: { dependencies: { typescript: "^4.5.0" } },
      });
      const result = await typescriptVersionRule.check(ctx);
      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe("warning");
    });
  });

  describe("gitStatusRule", () => {
    it("returns array with valid severity", async () => {
      const ctx = buildContext();
      const result = await gitStatusRule.check(ctx);
      expect(Array.isArray(result)).toBe(true);
      for (const item of result) {
        expect(["error", "warning", "info"]).toContain(item.severity);
        expect(typeof item.message).toBe("string");
      }
    });
  });

  describe("gitRemoteRule", () => {
    it("returns array with valid severity", async () => {
      const ctx = buildContext();
      const result = await gitRemoteRule.check(ctx);
      expect(Array.isArray(result)).toBe(true);
      for (const item of result) {
        expect(["error", "warning", "info"]).toContain(item.severity);
        expect(typeof item.message).toBe("string");
      }
    });
  });
});
