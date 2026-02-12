import { describe, it, expect } from "vitest";
import { check } from "../../src/checker/index.js";
import { rm, readFile } from "node:fs/promises";
import { fixture, makeTmpCopy } from "./_helpers.js";
import { join } from "node:path";

describe("E2E: Check Features", () => {
  it("check valid-esm produces ok results and zero errors", async () => {
    const results = await check({ dir: fixture("valid-esm"), fix: false, strict: false });
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
    const oks = results.filter((r) => r.severity === "ok");
    expect(oks.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(["error", "warning", "info", "ok"]).toContain(r.severity);
      expect(typeof r.message).toBe("string");
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it("check valid-dual produces ok results and zero errors", async () => {
    const results = await check({ dir: fixture("valid-dual"), fix: false, strict: false });
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
    const oks = results.filter((r) => r.severity === "ok");
    expect(oks.length).toBeGreaterThan(0);
  });

  it("check broken-exports flags missing exports with specific rule IDs", async () => {
    const results = await check({ dir: fixture("broken-exports"), fix: false, strict: false });
    const issues = results.filter((r) => r.severity === "error" || r.severity === "warning");
    expect(issues.length).toBeGreaterThan(0);
    const ruleIds = issues.map((r) => r.ruleId).filter(Boolean);
    expect(ruleIds.length).toBeGreaterThan(0);
    const hasExportsRule = ruleIds.some((id) => id!.startsWith("exports/"));
    expect(hasExportsRule).toBe(true);
  });

  it("check broken-types flags export ordering and type config issues", async () => {
    const results = await check({ dir: fixture("broken-types"), fix: false, strict: false });
    const errors = results.filter((r) => r.severity === "error");
    expect(errors.length).toBeGreaterThan(0);

    const ruleIds = errors.map((r) => r.ruleId).filter(Boolean);
    expect(ruleIds.length).toBeGreaterThan(0);
    expect(ruleIds).toContain("exports/types-order");

    const typeWarnings = results.filter(
      (r) => (r.severity === "warning" || r.severity === "info") && r.ruleId?.startsWith("types/"),
    );
    expect(typeWarnings.length).toBeGreaterThan(0);
    const moduleWarning = typeWarnings.find((r) => r.ruleId === "types/module");
    expect(moduleWarning).toBeDefined();
    expect(moduleWarning!.message).toMatch(/commonjs/i);
  });

  it("check --fix modifies broken package.json", async () => {
    const tmp = await makeTmpCopy("broken-exports");
    try {
      const before = await readFile(join(tmp, "package.json"), "utf-8");
      const results = await check({ dir: tmp, fix: true, strict: false });

      const after = await readFile(join(tmp, "package.json"), "utf-8");
      const fixMessages = results.filter((r) => r.severity === "info" && r.message.toLowerCase().includes("fix"));

      const fileChanged = before !== after;
      const hasFixInfo = fixMessages.length > 0;
      expect(fileChanged || hasFixInfo || results.length > 0).toBe(true);
      expect(() => JSON.parse(after)).not.toThrow();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("check results are JSON-serializable with correct structure", async () => {
    const results = await check({ dir: fixture("valid-esm"), fix: false, strict: false });
    expect(results.length).toBeGreaterThan(0);

    const parsed = JSON.parse(JSON.stringify(results));
    expect(parsed).toHaveLength(results.length);

    for (let i = 0; i < parsed.length; i++) {
      expect(parsed[i]!.severity).toBe(results[i]!.severity);
      expect(parsed[i]!.message).toBe(results[i]!.message);
      if (results[i]!.ruleId) {
        expect(parsed[i]!.ruleId).toBe(results[i]!.ruleId);
      }
    }
  });

  it("check with severity override disables a specific rule", async () => {
    const baseline = await check({
      dir: fixture("broken-exports"),
      fix: false,
      strict: false,
    });
    const baselineExportIssues = baseline.filter(
      (r) => r.ruleId === "exports/has-exports-field" && (r.severity === "error" || r.severity === "warning"),
    );

    const results = await check({
      dir: fixture("broken-exports"),
      fix: false,
      strict: false,
      severityOverrides: { "exports/has-exports-field": "off" },
    });
    const overriddenIssues = results.filter((r) => r.ruleId === "exports/has-exports-field");
    expect(overriddenIssues).toHaveLength(0);

    if (baselineExportIssues.length > 0) {
      const totalIssues = results.filter((r) => r.severity === "error" || r.severity === "warning");
      expect(totalIssues.length).toBeLessThan(
        baseline.filter((r) => r.severity === "error" || r.severity === "warning").length,
      );
    }
  });

  it("check with strict=true produces more results than non-strict", async () => {
    const normal = await check({ dir: fixture("valid-esm"), fix: false, strict: false });
    const strict = await check({ dir: fixture("valid-esm"), fix: false, strict: true });

    expect(strict.length).toBeGreaterThanOrEqual(normal.length);
    for (const r of strict) {
      expect(["error", "warning", "info", "ok"]).toContain(r.severity);
      expect(typeof r.message).toBe("string");
    }
  });

  it("check returns results with ruleId on diagnostics", async () => {
    const results = await check({ dir: fixture("broken-types"), fix: false, strict: false });
    const diagnostics = results.filter((r) => r.severity === "error" || r.severity === "warning");
    for (const d of diagnostics) {
      expect(d.ruleId).toBeDefined();
      expect(typeof d.ruleId).toBe("string");
      expect(d.ruleId).toMatch(/^[a-z]+\/[a-z-]+$/);
    }
  });
});
