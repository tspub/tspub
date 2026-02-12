import { describe, it, expect, vi, afterEach } from "vitest";
import {
  groupResultsByCategory,
  printGroupedResults,
  printResolutionTable,
  printListRules,
} from "../../src/checker/formatter.js";
import type { CheckResult } from "../../src/checker/index.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("groupResultsByCategory", () => {
  it("groups results by category prefix from ruleId", () => {
    const results: CheckResult[] = [
      { ruleId: "exports/dot-entry", severity: "error", message: "Missing ." },
      { ruleId: "exports/types-order", severity: "warning", message: "Types should be first" },
      { ruleId: "types/resolution", severity: "error", message: "Failed to resolve" },
      { ruleId: "files/sensitive", severity: "warning", message: "Sensitive file" },
    ];

    const grouped = groupResultsByCategory(results);

    expect(grouped.get("exports")).toHaveLength(2);
    expect(grouped.get("types")).toHaveLength(1);
    expect(grouped.get("files")).toHaveLength(1);
    expect(grouped.get("imports")).toHaveLength(0);
    expect(grouped.get("metadata")).toHaveLength(0);
    expect(grouped.get("size")).toHaveLength(0);
  });

  it("places info results without ruleId into a category matching by message content", () => {
    const results: CheckResult[] = [
      { severity: "info", message: "All exports checks passed" },
    ];

    const grouped = groupResultsByCategory(results);

    expect(grouped.get("exports")).toHaveLength(1);
    expect(grouped.get("exports")![0]!.message).toBe("All exports checks passed");
  });

  it("places ok results without ruleId into a category matching by message content", () => {
    const results: CheckResult[] = [
      { severity: "ok", message: "types look good" },
    ];

    const grouped = groupResultsByCategory(results);

    expect(grouped.get("types")).toHaveLength(1);
  });

  it("places results without ruleId that do not match any category into 'other'", () => {
    const results: CheckResult[] = [
      { severity: "info", message: "Something unrelated happened" },
    ];

    const grouped = groupResultsByCategory(results);

    expect(grouped.has("other")).toBe(true);
    expect(grouped.get("other")).toHaveLength(1);
    expect(grouped.get("other")![0]!.message).toBe("Something unrelated happened");
  });

  it("skips non-rule results with error/warning severity (no ruleId, not info/ok)", () => {
    const results: CheckResult[] = [
      { severity: "error", message: "Some random error without ruleId" },
      { severity: "warning", message: "Some random warning without ruleId" },
    ];

    const grouped = groupResultsByCategory(results);

    // These should not be placed anywhere since they have no ruleId and severity is not info/ok
    let total = 0;
    for (const [, entries] of grouped) {
      total += entries.length;
    }
    expect(total).toBe(0);
  });

  it("returns a map with empty arrays for each category when given empty results", () => {
    const grouped = groupResultsByCategory([]);

    expect(grouped.get("exports")).toEqual([]);
    expect(grouped.get("imports")).toEqual([]);
    expect(grouped.get("types")).toEqual([]);
    expect(grouped.get("files")).toEqual([]);
    expect(grouped.get("metadata")).toEqual([]);
    expect(grouped.get("size")).toEqual([]);
  });

  it("creates a new category for ruleIds with unknown category prefix", () => {
    const results: CheckResult[] = [
      { ruleId: "custom/my-rule", severity: "error", message: "Custom rule failed" },
    ];

    const grouped = groupResultsByCategory(results);

    expect(grouped.has("custom")).toBe(true);
    expect(grouped.get("custom")).toHaveLength(1);
  });
});

describe("printGroupedResults", () => {
  it("counts errors, warnings, and passed correctly", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      { ruleId: "exports/dot-entry", severity: "error", message: "Missing dot entry" },
      { ruleId: "exports/types-order", severity: "warning", message: "Types order" },
      { ruleId: "types/resolution", severity: "ok", message: "Resolution passed" },
      { ruleId: "files/sensitive", severity: "info", message: "Info message" },
    ];

    const counts = printGroupedResults(results, false);

    expect(counts.errors).toBe(1);
    expect(counts.warnings).toBe(1);
    expect(counts.passed).toBe(1);
  });

  it("in strict mode, warnings count as errors", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      { ruleId: "exports/dot-entry", severity: "error", message: "Error" },
      { ruleId: "exports/types-order", severity: "warning", message: "Warning as error" },
      { ruleId: "exports/file-exists", severity: "warning", message: "Another warning" },
    ];

    const counts = printGroupedResults(results, true);

    expect(counts.errors).toBe(3);
    expect(counts.warnings).toBe(0);
  });

  it("with compare=true, appends publint/attw mapping tags", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      { ruleId: "exports/type-module", severity: "error", message: "Use type module" },
    ];

    printGroupedResults(results, false, true);

    // The output should contain the publint mapping tag somewhere
    const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(allOutput).toContain("publint:USE_TYPE");
  });

  it("with compare=true, shows attw tags for types rules", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      { ruleId: "types/false-cjs-esm", severity: "error", message: "False CJS/ESM" },
    ];

    printGroupedResults(results, false, true);

    const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(allOutput).toContain("attw:FalseCJS / FalseESM");
  });

  it("skips empty categories", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      { ruleId: "exports/dot-entry", severity: "error", message: "Error in exports" },
    ];

    printGroupedResults(results, false);

    const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    // Only exports category should appear; types, files, etc. should not
    expect(allOutput).toContain("exports");
    expect(allOutput).not.toContain("── types ──");
    expect(allOutput).not.toContain("── files ──");
    expect(allOutput).not.toContain("── metadata ──");
    expect(allOutput).not.toContain("── size ──");
    expect(allOutput).not.toContain("── imports ──");
  });

  it("returns zeros when no results are provided", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    const counts = printGroupedResults([], false);

    expect(counts.errors).toBe(0);
    expect(counts.warnings).toBe(0);
    expect(counts.passed).toBe(0);
  });

  it("without compare flag, does not append mapping tags", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      { ruleId: "exports/type-module", severity: "error", message: "Use type module" },
    ];

    printGroupedResults(results, false, false);

    const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(allOutput).not.toContain("publint:");
  });
});

describe("printResolutionTable", () => {
  it("produces no output when there are no resolution results", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      { ruleId: "exports/dot-entry", severity: "error", message: "Not a resolution result" },
    ];

    printResolutionTable(results);

    expect(spy).not.toHaveBeenCalled();
  });

  it("produces no output for an empty results array", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    printResolutionTable([]);

    expect(spy).not.toHaveBeenCalled();
  });

  it("builds a table from structured data (r.data.entrypoint and r.data.mode)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      {
        ruleId: "types/resolution",
        severity: "ok",
        message: "Resolution OK for '.' in node16-esm",
        data: { entrypoint: ".", mode: "node16-esm" },
      },
      {
        ruleId: "types/resolution",
        severity: "error",
        message: "Resolution failed for '.' in bundler",
        data: { entrypoint: ".", mode: "bundler" },
      },
    ];

    printResolutionTable(results);

    const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(allOutput).toContain("Type Resolution:");
    expect(allOutput).toContain("Entrypoint");
    // The entrypoint "." should appear as a row
    expect(allOutput).toContain(".");
  });

  it("falls back to regex parsing from message text", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      {
        ruleId: "types/resolution",
        severity: "error",
        message: `Types for "." could not be resolved in node16-cjs mode`,
      },
      {
        ruleId: "types/resolution",
        severity: "ok",
        message: `Types for "." resolved correctly in bundler mode`,
      },
    ];

    printResolutionTable(results);

    const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(allOutput).toContain("Type Resolution:");
    expect(allOutput).toContain("Entrypoint");
  });

  it("handles mixed pass and fail entries", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      {
        ruleId: "types/resolution",
        severity: "ok",
        message: "OK",
        data: { entrypoint: ".", mode: "node16-esm" },
      },
      {
        ruleId: "types/resolution",
        severity: "error",
        message: "Fail",
        data: { entrypoint: ".", mode: "node16-cjs" },
      },
      {
        ruleId: "types/resolution",
        severity: "ok",
        message: "OK",
        data: { entrypoint: "./utils", mode: "bundler" },
      },
    ];

    printResolutionTable(results);

    const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    // Both entrypoints should appear
    expect(allOutput).toContain(".");
    expect(allOutput).toContain("./utils");
  });

  it("falls back to listing results as-is when message does not match regex and no structured data", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      {
        ruleId: "types/resolution",
        severity: "error",
        message: "Unparseable resolution message",
      },
      {
        ruleId: "types/resolution",
        severity: "ok",
        message: "Another unparseable resolution message",
      },
    ];

    printResolutionTable(results);

    const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(allOutput).toContain("Unparseable resolution message");
    expect(allOutput).toContain("Another unparseable resolution message");
  });

  it("orders mode columns in the stable known order", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const results: CheckResult[] = [
      {
        ruleId: "types/resolution",
        severity: "ok",
        message: "OK",
        data: { entrypoint: ".", mode: "bundler" },
      },
      {
        ruleId: "types/resolution",
        severity: "ok",
        message: "OK",
        data: { entrypoint: ".", mode: "node10" },
      },
      {
        ruleId: "types/resolution",
        severity: "ok",
        message: "OK",
        data: { entrypoint: ".", mode: "node16-esm" },
      },
    ];

    printResolutionTable(results);

    // Find the header line containing mode names
    const headerCall = spy.mock.calls.find((c) => {
      const text = c.join(" ");
      return text.includes("Entrypoint");
    });
    expect(headerCall).toBeDefined();
    const headerText = headerCall!.join(" ");

    // node10 should come before bundler in the header (stable order)
    const node10Idx = headerText.indexOf("node10");
    const bundlerIdx = headerText.indexOf("bundler");
    expect(node10Idx).toBeLessThan(bundlerIdx);
  });
});

describe("printListRules", () => {
  it("does not throw", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});

    expect(() => printListRules()).not.toThrow();
  });

  it("prints available rules header", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    printListRules();

    const allOutput = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(allOutput).toContain("Available rules:");
  });
});
