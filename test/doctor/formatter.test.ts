import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDoctorResults,
  type DoctorFormattedResult,
} from "../../src/doctor/formatter.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("formatDoctorResults", () => {
  describe("format='json'", () => {
    it("outputs JSON and returns correct error/warning counts", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        { ruleId: "environment/node-version", severity: "error", message: "Node too old" },
        { ruleId: "typescript/strict", severity: "warning", message: "Strict not enabled" },
        { ruleId: "build/output-dir", severity: "info", message: "Output dir is dist" },
      ];

      const counts = formatDoctorResults(results, "json");

      expect(counts.errors).toBe(1);
      expect(counts.warnings).toBe(1);

      // Should have been called exactly once with the JSON output
      expect(spy).toHaveBeenCalledTimes(1);
      const jsonOutput = spy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(jsonOutput);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]!.ruleId).toBe("environment/node-version");
    });

    it("outputs empty array JSON for empty results", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const counts = formatDoctorResults([], "json");

      expect(counts.errors).toBe(0);
      expect(counts.warnings).toBe(0);

      const jsonOutput = spy.mock.calls[0]![0] as string;
      expect(JSON.parse(jsonOutput)).toEqual([]);
    });
  });

  describe("format='text' (default)", () => {
    it("groups results by ruleId prefix category", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        { ruleId: "environment/node-version", severity: "error", message: "Node too old" },
        { ruleId: "environment/npm-version", severity: "warning", message: "npm outdated" },
        { ruleId: "typescript/strict", severity: "warning", message: "Strict mode off" },
      ];

      formatDoctorResults(results);

      const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(allOutput).toContain("environment");
      expect(allOutput).toContain("typescript");
    });

    it("counts errors and warnings correctly", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        { ruleId: "environment/node-version", severity: "error", message: "Error 1" },
        { ruleId: "environment/npm-version", severity: "error", message: "Error 2" },
        { ruleId: "typescript/strict", severity: "warning", message: "Warning 1" },
        { ruleId: "build/output-dir", severity: "info", message: "Info 1" },
      ];

      const counts = formatDoctorResults(results);

      expect(counts.errors).toBe(2);
      expect(counts.warnings).toBe(1);
    });

    it("returns {errors:0, warnings:0} for empty results", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      const counts = formatDoctorResults([]);

      expect(counts.errors).toBe(0);
      expect(counts.warnings).toBe(0);
    });

    it("skips empty categories", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        { ruleId: "environment/node-version", severity: "error", message: "Node too old" },
      ];

      formatDoctorResults(results);

      const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(allOutput).toContain("environment");
      expect(allOutput).not.toContain("── typescript ──");
      expect(allOutput).not.toContain("── build ──");
      expect(allOutput).not.toContain("── dependencies ──");
    });

    it("appends fixable hint for fixable results", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        {
          ruleId: "environment/node-version",
          severity: "error",
          message: "Node too old",
          fixable: "safe",
        },
        {
          ruleId: "typescript/strict",
          severity: "warning",
          message: "Strict not enabled",
          fixable: "unsafe",
        },
      ];

      formatDoctorResults(results);

      const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(allOutput).toContain("fixable: safe");
      expect(allOutput).toContain("fixable: unsafe");
    });

    it("does not append fixable hint when fixable is false", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        {
          ruleId: "environment/node-version",
          severity: "error",
          message: "Node too old",
          fixable: false,
        },
      ];

      formatDoctorResults(results);

      const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(allOutput).not.toContain("fixable:");
    });

    it("does not append fixable hint when fixable is undefined", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        {
          ruleId: "environment/node-version",
          severity: "error",
          message: "Node too old",
        },
      ];

      formatDoctorResults(results);

      const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(allOutput).not.toContain("fixable:");
    });

    it("creates a new category for ruleIds with unknown category prefix", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        { ruleId: "custom/my-rule", severity: "warning", message: "Custom warning" },
      ];

      formatDoctorResults(results);

      const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(allOutput).toContain("custom");
    });

    it("handles info severity correctly", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        { ruleId: "build/output-dir", severity: "info", message: "Output directory is dist" },
      ];

      const counts = formatDoctorResults(results);

      // info should not count as error or warning
      expect(counts.errors).toBe(0);
      expect(counts.warnings).toBe(0);

      const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(allOutput).toContain("build");
    });

    it("handles multiple results in the same category", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      const results: DoctorFormattedResult[] = [
        { ruleId: "environment/node-version", severity: "error", message: "Node too old" },
        { ruleId: "environment/npm-version", severity: "warning", message: "npm outdated" },
        { ruleId: "environment/git-version", severity: "info", message: "git version ok" },
      ];

      formatDoctorResults(results);

      const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
      // All three messages should appear
      expect(allOutput).toContain("Node too old");
      expect(allOutput).toContain("npm outdated");
      expect(allOutput).toContain("git version ok");
    });
  });
});
