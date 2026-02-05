import { describe, it, expect } from "vitest";
import { check } from "../../src/checker/index.js";
import { join } from "node:path";

const fixturesDir = join(import.meta.dirname, "..", "fixtures");

describe("tspub check", () => {
  it("passes for valid ESM package", async () => {
    const results = await check({
      dir: join(fixturesDir, "valid-esm"),
      fix: false,
      strict: false,
    });
    const errors = results.filter((r) => r.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("reports warnings for broken-exports package", async () => {
    const results = await check({
      dir: join(fixturesDir, "broken-exports"),
      fix: false,
      strict: false,
    });
    const issues = results.filter((r) => r.severity === "error" || r.severity === "warning");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("reports warnings for missing-fields package", async () => {
    const results = await check({
      dir: join(fixturesDir, "missing-fields"),
      fix: false,
      strict: false,
    });
    const issues = results.filter((r) => r.severity === "error" || r.severity === "warning");
    expect(issues.length).toBeGreaterThan(0);
  });
});
