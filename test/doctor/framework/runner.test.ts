import { describe, it, expect, vi, beforeEach } from "vitest";
import { runDoctorRules } from "../../../src/doctor/framework/runner.js";
import type {
  DoctorRule,
  DoctorContext,
  DoctorFixContext,
} from "../../../src/doctor/framework/types.js";
import type { PackageJson } from "../../../src/shared/package-json.js";

vi.mock("../../../src/shared/package-json.js", () => ({
  readPackageJson: vi.fn(),
  writePackageJson: vi.fn(),
}));

vi.mock("node:readline/promises", () => ({
  createInterface: vi.fn(),
}));

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

describe("doctor framework runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runDoctorRules", () => {
    it("runs rules and collects diagnostics", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "test warning" },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(mockRule.check).toHaveBeenCalledWith(ctx);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.ruleId).toBe("test/rule");
      expect(result.diagnostics[0]?.severity).toBe("warning");
      expect(result.diagnostics[0]?.message).toBe("test warning");
    });

    it("overrides severity with custom value", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/override-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "test message" },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
        severityOverrides: { "test/override-rule": "error" },
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.severity).toBe("error");
      expect(result.diagnostics[0]?.message).toBe("test message");
    });

    it("skips rule when severity is 'off'", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/skipped-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "should not appear" },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
        severityOverrides: { "test/skipped-rule": "off" },
      });

      expect(result.diagnostics).toHaveLength(0);
      expect(mockRule.check).not.toHaveBeenCalled();
    });

    it("captures rule that throws as error diagnostic", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/throwing-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockImplementation(() => {
          throw new Error("Rule exploded");
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.severity).toBe("error");
      expect(result.diagnostics[0]?.ruleId).toBe("test/throwing-rule");
      expect(result.diagnostics[0]?.message).toContain("threw");
      expect(result.diagnostics[0]?.message).toContain("Rule exploded");
    });

    it("runs fix when fix=true and rule is fixable with diagnostics", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/fixable-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "test warning" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "fixed",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(mockRule.fix).toHaveBeenCalled();
      expect(result.fixes).toHaveLength(1);
      expect(result.fixes[0]?.message).toBe("fixed");
    });

    it("does not run fix when fix=false", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/fixable-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "test warning" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "fixed",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(mockRule.fix).not.toHaveBeenCalled();
      expect(result.fixes).toHaveLength(0);
    });

    it("previews fix without mutating pkg in dryRun mode", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/dryrun-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockImplementation((ctx: DoctorFixContext) => {
          ctx.pkg.name = "modified";
          return { message: "would modify pkg", pkgModified: true };
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = { name: "original" };
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
        dryRun: true,
      });

      expect(result.fixes).toHaveLength(1);
      expect(result.fixes[0]?.message).toBe("would modify pkg");
      expect(pkg.name).toBe("original");
    });

    it("runs unsafe fix only when unsafe=true", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/unsafe-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: "unsafe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs unsafe fix" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "unsafe fix applied",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};

      // Without unsafe: fix should not run
      const result1 = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });
      expect(mockRule.fix).not.toHaveBeenCalled();
      expect(result1.fixes).toHaveLength(0);

      // With unsafe=true: fix should run
      const result2 = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
        unsafe: true,
      });
      expect(mockRule.fix).toHaveBeenCalled();
      expect(result2.fixes).toHaveLength(1);
      expect(result2.fixes[0]?.message).toBe("unsafe fix applied");
    });

    it("skips fix when rule has no fix function", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/no-fix-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "test warning" },
        ]),
        // No fix function
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(result.fixes).toHaveLength(0);
    });

    it("accumulates diagnostics and fixes from multiple rules", async () => {
      const rule1: DoctorRule = {
        meta: {
          id: "test/rule1",
          description: "test rule 1",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "warning from rule1" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "fix from rule1",
          pkgModified: false,
        }),
      };

      const rule2: DoctorRule = {
        meta: {
          id: "test/rule2",
          description: "test rule 2",
          defaultSeverity: "error",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "error", message: "error from rule2" },
        ]),
      };

      const rule3: DoctorRule = {
        meta: {
          id: "test/rule3",
          description: "test rule 3",
          defaultSeverity: "info",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "info", message: "info from rule3" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "fix from rule3",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([rule1, rule2, rule3], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(result.diagnostics).toHaveLength(3);
      expect(result.diagnostics[0]?.ruleId).toBe("test/rule1");
      expect(result.diagnostics[1]?.ruleId).toBe("test/rule2");
      expect(result.diagnostics[2]?.ruleId).toBe("test/rule3");
      expect(result.fixes).toHaveLength(2);
      expect(result.fixes[0]?.message).toBe("fix from rule1");
      expect(result.fixes[1]?.message).toBe("fix from rule3");
    });

    it("writes package.json when fix modifies pkg", async () => {
      const { writePackageJson } = await import(
        "../../../src/shared/package-json.js"
      );

      const mockRule: DoctorRule = {
        meta: {
          id: "test/pkg-modify-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "modified pkg",
          pkgModified: true,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = { name: "test-pkg" };
      await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(writePackageJson).toHaveBeenCalledWith("/tmp/test", pkg);
    });

    it("does not write package.json when fix does not modify pkg", async () => {
      const { writePackageJson } = await import(
        "../../../src/shared/package-json.js"
      );
      vi.mocked(writePackageJson).mockClear();

      const mockRule: DoctorRule = {
        meta: {
          id: "test/no-pkg-modify-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "no pkg change",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(writePackageJson).not.toHaveBeenCalled();
    });

    // --- NEW TESTS FOR UNCOVERED PATHS ---

    it("handles async check handlers that return a Promise", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/async-check",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockResolvedValue([
          { severity: "warning", message: "async warning" },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.message).toBe("async warning");
    });

    it("handles async check that rejects with an Error", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/async-throw",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockRejectedValue(new Error("async boom")),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.severity).toBe("error");
      expect(result.diagnostics[0]?.message).toContain("async boom");
    });

    it("captures non-Error thrown values as string in check", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/throw-string",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockImplementation(() => {
          throw "string error";
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.severity).toBe("error");
      expect(result.diagnostics[0]?.message).toContain("string error");
    });

    it("includes data in diagnostics when raw diagnostic has data", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/data-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          {
            severity: "warning",
            message: "with data",
            data: { key: "value", count: 42 },
          },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.data).toEqual({ key: "value", count: 42 });
    });

    it("omits data field when raw diagnostic has no data", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/no-data-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "no data" },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]!).not.toHaveProperty("data");
    });

    it("captures fix error in dryRun mode as error diagnostic", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/dryrun-fix-throws",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockImplementation(() => {
          throw new Error("dryRun fix error");
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
        dryRun: true,
      });

      expect(result.fixes).toHaveLength(0);
      expect(result.diagnostics).toHaveLength(2);
      const fixErrDiag = result.diagnostics.find((d) =>
        d.message.includes("fix threw"),
      );
      expect(fixErrDiag).toBeDefined();
      expect(fixErrDiag?.severity).toBe("error");
      expect(fixErrDiag?.message).toContain("dryRun fix error");
    });

    it("captures fix error in normal mode as error diagnostic", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/fix-throws",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockImplementation(() => {
          throw new Error("normal fix error");
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(result.fixes).toHaveLength(0);
      const fixErrDiag = result.diagnostics.find((d) =>
        d.message.includes("fix threw"),
      );
      expect(fixErrDiag).toBeDefined();
      expect(fixErrDiag?.severity).toBe("error");
      expect(fixErrDiag?.message).toContain("normal fix error");
    });

    it("captures non-Error thrown from fix in normal mode", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/fix-throw-string",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockImplementation(() => {
          throw 42;
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      const fixErrDiag = result.diagnostics.find((d) =>
        d.message.includes("fix threw"),
      );
      expect(fixErrDiag).toBeDefined();
      expect(fixErrDiag?.message).toContain("42");
    });

    it("skips fix result with empty message in normal mode", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/empty-fix-msg",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(mockRule.fix).toHaveBeenCalled();
      expect(result.fixes).toHaveLength(0);
    });

    it("skips fix result with empty message in dryRun mode", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/dryrun-empty-msg",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
        dryRun: true,
      });

      expect(mockRule.fix).toHaveBeenCalled();
      expect(result.fixes).toHaveLength(0);
    });

    it("does not write package.json in dryRun mode even when pkgModified", async () => {
      const { writePackageJson } = await import(
        "../../../src/shared/package-json.js"
      );
      vi.mocked(writePackageJson).mockClear();

      const mockRule: DoctorRule = {
        meta: {
          id: "test/dryrun-no-write",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockImplementation((ctx: DoctorFixContext) => {
          ctx.pkg.name = "modified";
          return { message: "would modify", pkgModified: true };
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = { name: "original" };
      await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
        dryRun: true,
      });

      expect(writePackageJson).not.toHaveBeenCalled();
      expect(pkg.name).toBe("original");
    });

    it("passes dir to fix context", async () => {
      const fixSpy = vi.fn().mockReturnValue({
        message: "fixed",
        pkgModified: false,
      });

      const mockRule: DoctorRule = {
        meta: {
          id: "test/fix-ctx-rule",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: fixSpy,
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(fixSpy).toHaveBeenCalledWith({
        pkg,
        dir: "/tmp/test",
      });
    });

    it("skips rule with 'off' but continues running other rules", async () => {
      const skippedRule: DoctorRule = {
        meta: {
          id: "test/skipped",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "should be skipped" },
        ]),
      };

      const keptRule: DoctorRule = {
        meta: {
          id: "test/kept",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "should appear" },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([skippedRule, keptRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
        severityOverrides: { "test/skipped": "off" },
      });

      expect(skippedRule.check).not.toHaveBeenCalled();
      expect(keptRule.check).toHaveBeenCalled();
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.ruleId).toBe("test/kept");
    });

    it("continues after a throwing rule and processes remaining rules", async () => {
      const throwingRule: DoctorRule = {
        meta: {
          id: "test/throws",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockImplementation(() => {
          throw new Error("kaboom");
        }),
      };

      const normalRule: DoctorRule = {
        meta: {
          id: "test/normal",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "info", message: "all good" },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([throwingRule, normalRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(2);
      expect(result.diagnostics[0]?.ruleId).toBe("test/throws");
      expect(result.diagnostics[0]?.message).toContain("kaboom");
      expect(result.diagnostics[1]?.ruleId).toBe("test/normal");
      expect(result.diagnostics[1]?.message).toBe("all good");
    });

    it("handles rule that returns empty diagnostics array", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/empty-diags",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([]),
        fix: vi.fn().mockReturnValue({
          message: "should not be called",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(result.diagnostics).toHaveLength(0);
      expect(mockRule.fix).not.toHaveBeenCalled();
      expect(result.fixes).toHaveLength(0);
    });

    it("handles multiple diagnostics from a single rule check", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/multi-diag",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "first" },
          { severity: "error", message: "second" },
          { severity: "info", message: "third", data: { hint: "some hint" } },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(3);
      expect(result.diagnostics[0]?.severity).toBe("warning");
      expect(result.diagnostics[1]?.severity).toBe("error");
      expect(result.diagnostics[2]?.severity).toBe("info");
      expect(result.diagnostics[2]?.data).toEqual({ hint: "some hint" });
    });

    it("overrides severity for all diagnostics from a single rule", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/multi-override",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "first" },
          { severity: "info", message: "second" },
        ]),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
        severityOverrides: { "test/multi-override": "error" },
      });

      expect(result.diagnostics).toHaveLength(2);
      expect(result.diagnostics[0]?.severity).toBe("error");
      expect(result.diagnostics[1]?.severity).toBe("error");
    });

    it("returns empty results for empty rules array", async () => {
      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: false,
      });

      expect(result.diagnostics).toHaveLength(0);
      expect(result.fixes).toHaveLength(0);
    });

    it("does not run fix when fixable is false even with fix=true", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/not-fixable",
          description: "test",
          defaultSeverity: "warning",
          fixable: false,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "test" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "should not run",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(mockRule.fix).not.toHaveBeenCalled();
      expect(result.fixes).toHaveLength(0);
    });

    it("captures non-Error thrown from fix in dryRun mode", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/dryrun-fix-throw-string",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockImplementation(() => {
          throw "string fix error";
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
        dryRun: true,
      });

      const fixErrDiag = result.diagnostics.find((d) =>
        d.message.includes("fix threw"),
      );
      expect(fixErrDiag).toBeDefined();
      expect(fixErrDiag?.message).toContain("string fix error");
    });

    describe("interactive mode", () => {
      it("applies fix when user confirms with y", async () => {
        const { createInterface } = await import("node:readline/promises");
        vi.mocked(createInterface).mockReturnValue({
          question: vi.fn().mockResolvedValue("y"),
          close: vi.fn(),
        } as unknown as ReturnType<typeof createInterface>);

        const mockRule: DoctorRule = {
          meta: {
            id: "test/interactive-confirm",
            description: "test",
            defaultSeverity: "warning",
            fixable: "safe" as const,
            category: "test",
          },
          check: vi.fn().mockReturnValue([
            { severity: "warning", message: "needs fix" },
          ]),
          fix: vi.fn().mockReturnValue({
            message: "interactive fix",
            pkgModified: false,
          }),
        };

        const ctx = buildContext();
        const pkg: PackageJson = {};
        const result = await runDoctorRules([mockRule], ctx, {
          dir: "/tmp/test",
          pkg,
          fix: true,
          interactive: true,
        });

        expect(result.fixes).toHaveLength(1);
        expect(result.fixes[0]?.message).toBe("interactive fix");
      });

      it("skips fix when user declines with N", async () => {
        const { createInterface } = await import("node:readline/promises");
        vi.mocked(createInterface).mockReturnValue({
          question: vi.fn().mockResolvedValue("N"),
          close: vi.fn(),
        } as unknown as ReturnType<typeof createInterface>);

        const mockRule: DoctorRule = {
          meta: {
            id: "test/interactive-decline",
            description: "test",
            defaultSeverity: "warning",
            fixable: "safe" as const,
            category: "test",
          },
          check: vi.fn().mockReturnValue([
            { severity: "warning", message: "needs fix" },
          ]),
          fix: vi.fn().mockReturnValue({
            message: "declined fix",
            pkgModified: false,
          }),
        };

        const ctx = buildContext();
        const pkg: PackageJson = {};
        const result = await runDoctorRules([mockRule], ctx, {
          dir: "/tmp/test",
          pkg,
          fix: true,
          interactive: true,
        });

        expect(result.fixes).toHaveLength(0);
      });

      it("applies pkg changes in interactive mode when confirmed and pkgModified", async () => {
        const { createInterface } = await import("node:readline/promises");
        const { writePackageJson } = await import(
          "../../../src/shared/package-json.js"
        );
        vi.mocked(writePackageJson).mockClear();
        vi.mocked(createInterface).mockReturnValue({
          question: vi.fn().mockResolvedValue("y"),
          close: vi.fn(),
        } as unknown as ReturnType<typeof createInterface>);

        const mockRule: DoctorRule = {
          meta: {
            id: "test/interactive-pkg-modify",
            description: "test",
            defaultSeverity: "warning",
            fixable: "safe" as const,
            category: "test",
          },
          check: vi.fn().mockReturnValue([
            { severity: "warning", message: "needs fix" },
          ]),
          fix: vi.fn().mockImplementation((ctx: DoctorFixContext) => {
            ctx.pkg.name = "modified-name";
            return { message: "modified pkg", pkgModified: true };
          }),
        };

        const ctx = buildContext();
        const pkg: PackageJson = { name: "original" };
        await runDoctorRules([mockRule], ctx, {
          dir: "/tmp/test",
          pkg,
          fix: true,
          interactive: true,
        });

        expect(pkg.name).toBe("modified-name");
        expect(writePackageJson).toHaveBeenCalledWith("/tmp/test", pkg);
      });

      it("deletes keys from pkg removed by the clone in interactive mode", async () => {
        const { createInterface } = await import("node:readline/promises");
        const { writePackageJson } = await import(
          "../../../src/shared/package-json.js"
        );
        vi.mocked(writePackageJson).mockClear();
        vi.mocked(createInterface).mockReturnValue({
          question: vi.fn().mockResolvedValue("y"),
          close: vi.fn(),
        } as unknown as ReturnType<typeof createInterface>);

        const mockRule: DoctorRule = {
          meta: {
            id: "test/interactive-delete-key",
            description: "test",
            defaultSeverity: "warning",
            fixable: "safe" as const,
            category: "test",
          },
          check: vi.fn().mockReturnValue([
            { severity: "warning", message: "needs fix" },
          ]),
          fix: vi.fn().mockImplementation((ctx: DoctorFixContext) => {
            delete (ctx.pkg as Record<string, unknown>)["main"];
            return { message: "removed main field", pkgModified: true };
          }),
        };

        const ctx = buildContext();
        const pkg: PackageJson = {
          name: "test",
          main: "dist/index.js",
          version: "1.0.0",
        };
        await runDoctorRules([mockRule], ctx, {
          dir: "/tmp/test",
          pkg,
          fix: true,
          interactive: true,
        });

        expect(pkg).not.toHaveProperty("main");
        expect(pkg.name).toBe("test");
        expect(pkg.version).toBe("1.0.0");
      });

      it("does not apply pkg changes when confirmed but pkgModified is false", async () => {
        const { createInterface } = await import("node:readline/promises");
        const { writePackageJson } = await import(
          "../../../src/shared/package-json.js"
        );
        vi.mocked(writePackageJson).mockClear();
        vi.mocked(createInterface).mockReturnValue({
          question: vi.fn().mockResolvedValue("y"),
          close: vi.fn(),
        } as unknown as ReturnType<typeof createInterface>);

        const mockRule: DoctorRule = {
          meta: {
            id: "test/interactive-no-pkg-mod",
            description: "test",
            defaultSeverity: "warning",
            fixable: "safe" as const,
            category: "test",
          },
          check: vi.fn().mockReturnValue([
            { severity: "warning", message: "needs fix" },
          ]),
          fix: vi.fn().mockReturnValue({
            message: "file-based fix only",
            pkgModified: false,
          }),
        };

        const ctx = buildContext();
        const pkg: PackageJson = { name: "original" };
        const result = await runDoctorRules([mockRule], ctx, {
          dir: "/tmp/test",
          pkg,
          fix: true,
          interactive: true,
        });

        expect(result.fixes).toHaveLength(1);
        expect(result.fixes[0]?.message).toBe("file-based fix only");
        expect(writePackageJson).not.toHaveBeenCalled();
      });

      it("skips fix with empty preview message in interactive mode", async () => {
        const { createInterface } = await import("node:readline/promises");
        vi.mocked(createInterface).mockReturnValue({
          question: vi.fn().mockResolvedValue("y"),
          close: vi.fn(),
        } as unknown as ReturnType<typeof createInterface>);

        const mockRule: DoctorRule = {
          meta: {
            id: "test/interactive-empty-msg",
            description: "test",
            defaultSeverity: "warning",
            fixable: "safe" as const,
            category: "test",
          },
          check: vi.fn().mockReturnValue([
            { severity: "warning", message: "needs fix" },
          ]),
          fix: vi.fn().mockReturnValue({
            message: "",
            pkgModified: false,
          }),
        };

        const ctx = buildContext();
        const pkg: PackageJson = {};
        const result = await runDoctorRules([mockRule], ctx, {
          dir: "/tmp/test",
          pkg,
          fix: true,
          interactive: true,
        });

        const { createInterface: ci } = await import(
          "node:readline/promises"
        );
        expect(vi.mocked(ci)).not.toHaveBeenCalled();
        expect(result.fixes).toHaveLength(0);
      });

      it("captures fix error in interactive mode", async () => {
        const { createInterface } = await import("node:readline/promises");
        vi.mocked(createInterface).mockReturnValue({
          question: vi.fn().mockResolvedValue("y"),
          close: vi.fn(),
        } as unknown as ReturnType<typeof createInterface>);

        const mockRule: DoctorRule = {
          meta: {
            id: "test/interactive-fix-throws",
            description: "test",
            defaultSeverity: "warning",
            fixable: "safe" as const,
            category: "test",
          },
          check: vi.fn().mockReturnValue([
            { severity: "warning", message: "needs fix" },
          ]),
          fix: vi.fn().mockImplementation(() => {
            throw new Error("interactive fix error");
          }),
        };

        const ctx = buildContext();
        const pkg: PackageJson = {};
        const result = await runDoctorRules([mockRule], ctx, {
          dir: "/tmp/test",
          pkg,
          fix: true,
          interactive: true,
        });

        expect(result.fixes).toHaveLength(0);
        const fixErrDiag = result.diagnostics.find((d) =>
          d.message.includes("fix threw"),
        );
        expect(fixErrDiag).toBeDefined();
        expect(fixErrDiag?.severity).toBe("error");
        expect(fixErrDiag?.message).toContain("interactive fix error");
      });

      it("captures non-Error thrown from fix in interactive mode", async () => {
        const { createInterface } = await import("node:readline/promises");
        vi.mocked(createInterface).mockReturnValue({
          question: vi.fn().mockResolvedValue("y"),
          close: vi.fn(),
        } as unknown as ReturnType<typeof createInterface>);

        const mockRule: DoctorRule = {
          meta: {
            id: "test/interactive-fix-throw-nonError",
            description: "test",
            defaultSeverity: "warning",
            fixable: "safe" as const,
            category: "test",
          },
          check: vi.fn().mockReturnValue([
            { severity: "warning", message: "needs fix" },
          ]),
          fix: vi.fn().mockImplementation(() => {
            throw { code: "ENOENT" };
          }),
        };

        const ctx = buildContext();
        const pkg: PackageJson = {};
        const result = await runDoctorRules([mockRule], ctx, {
          dir: "/tmp/test",
          pkg,
          fix: true,
          interactive: true,
        });

        const fixErrDiag = result.diagnostics.find((d) =>
          d.message.includes("fix threw"),
        );
        expect(fixErrDiag).toBeDefined();
        expect(fixErrDiag?.message).toContain("[object Object]");
      });
    });

    it("handles fix with async (Promise-returning) fix function", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/async-fix",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockResolvedValue({
          message: "async fix applied",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(result.fixes).toHaveLength(1);
      expect(result.fixes[0]?.message).toBe("async fix applied");
    });

    it("handles fix with async (Promise-rejecting) fix function", async () => {
      const mockRule: DoctorRule = {
        meta: {
          id: "test/async-fix-reject",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: vi.fn().mockRejectedValue(new Error("async fix failure")),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      const result = await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(result.fixes).toHaveLength(0);
      const fixErrDiag = result.diagnostics.find((d) =>
        d.message.includes("fix threw"),
      );
      expect(fixErrDiag).toBeDefined();
      expect(fixErrDiag?.message).toContain("async fix failure");
    });

    it("does not write package.json when no fix modifies pkg even with multiple rules", async () => {
      const { writePackageJson } = await import(
        "../../../src/shared/package-json.js"
      );
      vi.mocked(writePackageJson).mockClear();

      const rule1: DoctorRule = {
        meta: {
          id: "test/rule1",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "w1" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "fix1",
          pkgModified: false,
        }),
      };

      const rule2: DoctorRule = {
        meta: {
          id: "test/rule2",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "w2" },
        ]),
        fix: vi.fn().mockReturnValue({
          message: "fix2",
          pkgModified: false,
        }),
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      await runDoctorRules([rule1, rule2], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
      });

      expect(writePackageJson).not.toHaveBeenCalled();
    });

    it("passes dir to fix in dryRun mode", async () => {
      const fixSpy = vi.fn().mockReturnValue({
        message: "dry fix",
        pkgModified: false,
      });

      const mockRule: DoctorRule = {
        meta: {
          id: "test/dryrun-dir",
          description: "test",
          defaultSeverity: "warning",
          fixable: "safe" as const,
          category: "test",
        },
        check: vi.fn().mockReturnValue([
          { severity: "warning", message: "needs fix" },
        ]),
        fix: fixSpy,
      };

      const ctx = buildContext();
      const pkg: PackageJson = {};
      await runDoctorRules([mockRule], ctx, {
        dir: "/tmp/test",
        pkg,
        fix: true,
        dryRun: true,
      });

      expect(fixSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          dir: "/tmp/test",
        }),
      );
    });
  });
});
