import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { runDoctorRules } from "../../../src/doctor/framework/runner.js";
import type {
  DoctorRule,
  DoctorContext,
  DoctorRawDiagnostic,
  DoctorFixContext,
  DoctorFixResult,
} from "../../../src/doctor/framework/types.js";
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

describe("doctor runner", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(
      "/tmp",
      `tspub-test-runner-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("runDoctorRules", () => {
    it("runs rules and collects diagnostics", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/mock-rule",
          description: "Mock rule",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: () => [{ severity: "warning", message: "Test warning" }],
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.ruleId).toBe("test/mock-rule");
      expect(result.diagnostics[0]?.severity).toBe("warning");
      expect(result.diagnostics[0]?.message).toBe("Test warning");
    });

    it("skips rule when severity is 'off'", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/skipped-rule",
          description: "Skipped rule",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: () => [{ severity: "warning", message: "Should not see this" }],
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: false,
        severityOverrides: { "test/skipped-rule": "off" },
      });

      expect(result.diagnostics).toHaveLength(0);
    });

    it("overrides severity with custom value", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/override-rule",
          description: "Override rule",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: () => [{ severity: "warning", message: "Test message" }],
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: false,
        severityOverrides: { "test/override-rule": "error" },
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.severity).toBe("error");
    });

    it("runs fix when fix=true and rule is fixable", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/fixable-rule",
          description: "Fixable rule",
          defaultSeverity: "warning",
          fixable: "safe",
          category: "test",
        },
        check: () => [{ severity: "warning", message: "Needs fix" }],
        fix: () => ({ message: "Fixed it", pkgModified: false }),
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: true,
      });

      expect(result.fixes).toHaveLength(1);
      expect(result.fixes[0]?.message).toBe("Fixed it");
    });

    it("does not run fix when rule has no diagnostics", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/no-diag-rule",
          description: "No diagnostics",
          defaultSeverity: "warning",
          fixable: "safe",
          category: "test",
        },
        check: () => [],
        fix: () => ({ message: "Should not run", pkgModified: false }),
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: true,
      });

      expect(result.fixes).toHaveLength(0);
    });

    it("runs unsafe fixes when unsafe=true", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/unsafe-rule",
          description: "Unsafe rule",
          defaultSeverity: "warning",
          fixable: "unsafe",
          category: "test",
        },
        check: () => [{ severity: "warning", message: "Needs unsafe fix" }],
        fix: () => ({ message: "Unsafe fix applied", pkgModified: false }),
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: true,
        unsafe: true,
      });

      expect(result.fixes).toHaveLength(1);
      expect(result.fixes[0]?.message).toBe("Unsafe fix applied");
    });

    it("does not run unsafe fixes when unsafe is not set", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/unsafe-skip-rule",
          description: "Unsafe skip rule",
          defaultSeverity: "warning",
          fixable: "unsafe",
          category: "test",
        },
        check: () => [{ severity: "warning", message: "Needs unsafe fix" }],
        fix: () => ({ message: "Should not run", pkgModified: false }),
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: true,
      });

      expect(result.fixes).toHaveLength(0);
    });

    it("previews fixes without mutating pkg in dry-run mode", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/dryrun-rule",
          description: "Dry run rule",
          defaultSeverity: "warning",
          fixable: "safe",
          category: "test",
        },
        check: () => [{ severity: "warning", message: "Needs fix" }],
        fix: (ctx: DoctorFixContext) => {
          ctx.pkg.name = "modified";
          return { message: "Would modify pkg", pkgModified: true };
        },
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = { name: "original" };
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: true,
        dryRun: true,
      });

      expect(result.fixes).toHaveLength(1);
      expect(result.fixes[0]?.message).toBe("Would modify pkg");
      expect(pkg.name).toBe("original"); // Should not be modified
    });

    it("captures rule that throws as error diagnostic", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/throwing-rule",
          description: "Throwing rule",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: () => {
          throw new Error("Rule failed");
        },
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.severity).toBe("error");
      expect(result.diagnostics[0]?.message).toContain("threw");
      expect(result.diagnostics[0]?.message).toContain("Rule failed");
    });

    it("captures fix that throws as error diagnostic", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/fix-throwing-rule",
          description: "Fix throwing rule",
          defaultSeverity: "warning",
          fixable: "safe",
          category: "test",
        },
        check: () => [{ severity: "warning", message: "Needs fix" }],
        fix: () => {
          throw new Error("Fix failed");
        },
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: true,
      });

      expect(result.diagnostics).toHaveLength(2); // Original warning + error
      const errorDiag = result.diagnostics.find((d) => d.severity === "error");
      expect(errorDiag).toBeDefined();
      expect(errorDiag?.message).toContain("fix threw");
      expect(errorDiag?.message).toContain("Fix failed");
    });

    it("handles async rules", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/async-rule",
          description: "Async rule",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return [{ severity: "warning", message: "Async warning" }];
        },
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: tempDir,
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.message).toBe("Async warning");
    });

    it("handles multiple rules", async () => {
      const rule1: DoctorRule = {
        meta: {
          id: "test/rule1",
          description: "Rule 1",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: () => [{ severity: "warning", message: "Warning 1" }],
      };

      const rule2: DoctorRule = {
        meta: {
          id: "test/rule2",
          description: "Rule 2",
          defaultSeverity: "error",
          fixable: false,
          category: "test",
        },
        check: () => [{ severity: "error", message: "Error 2" }],
      };

      const ctx = buildContext({ dir: tempDir });
      const pkg: PackageJson = {};
      const result = await runDoctorRules([rule1, rule2], ctx, {
        dir: tempDir,
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(2);
      expect(result.diagnostics[0]?.ruleId).toBe("test/rule1");
      expect(result.diagnostics[1]?.ruleId).toBe("test/rule2");
    });
  });
});
