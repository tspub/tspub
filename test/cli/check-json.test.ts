import { describe, it, expect } from "vitest";
import { check } from "../../src/checker/index.js";
import { join } from "node:path";

const fixturesDir = join(import.meta.dirname, "..", "fixtures");

describe("check --format json", () => {
  it("produces valid JSON-serializable output", async () => {
    const results = await check({
      dir: join(fixturesDir, "valid-esm"),
      fix: false,
      strict: false,
    });

    let errors = 0;
    let warnings = 0;
    for (const r of results) {
      if (r.severity === "error") errors++;
      if (r.severity === "warning") warnings++;
    }

    const output = { results, summary: { errors, warnings } };
    const json = JSON.stringify(output, null, 2);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty("results");
    expect(parsed).toHaveProperty("summary");
    expect(Array.isArray(parsed.results)).toBe(true);
    expect(typeof parsed.summary.errors).toBe("number");
    expect(typeof parsed.summary.warnings).toBe("number");
  });
});
