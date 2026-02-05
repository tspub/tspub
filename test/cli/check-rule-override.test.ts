import { describe, it, expect } from "vitest";
import { check } from "../../src/checker/index.js";
import { join } from "node:path";

const fixturesDir = join(import.meta.dirname, "..", "fixtures");

describe("check --rule override", () => {
  it("skips rule when set to off via severityOverrides", async () => {
    const results = await check({
      dir: join(fixturesDir, "valid-esm"),
      fix: false,
      strict: false,
      severityOverrides: { "exports/file-exists": "off" },
    });
    // The rule should not appear in results
    const fileExistsResults = results.filter(
      (r) => r.ruleId === "exports/file-exists",
    );
    expect(fileExistsResults).toHaveLength(0);
  });

  it("changes severity when overridden", async () => {
    const results = await check({
      dir: join(fixturesDir, "valid-esm"),
      fix: false,
      strict: false,
      severityOverrides: { "metadata/license": "error" },
    });
    // Should still run, just with different severity
    expect(results.length).toBeGreaterThan(0);
  });
});
