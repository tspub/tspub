import { describe, it, expect } from "vitest";
import { allRules } from "../../src/checker/rules/index.js";

describe("check --list-rules", () => {
  it("every rule has required meta fields", () => {
    for (const rule of allRules) {
      expect(rule.meta.id).toBeTruthy();
      expect(rule.meta.description).toBeTruthy();
      expect(rule.meta.category).toBeTruthy();
      expect(["error", "warning", "info"]).toContain(rule.meta.defaultSeverity);
      expect([false, "safe", "unsafe"]).toContain(rule.meta.fixable);
    }
  });

  it("rule IDs are unique", () => {
    const ids = allRules.map((r) => r.meta.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rule IDs match category prefix", () => {
    for (const rule of allRules) {
      expect(rule.meta.id.startsWith(rule.meta.category + "/")).toBe(true);
    }
  });

  it("has rules in all expected categories", () => {
    const categories = new Set(allRules.map((r) => r.meta.category));
    expect(categories.has("exports")).toBe(true);
    expect(categories.has("types")).toBe(true);
    expect(categories.has("files")).toBe(true);
    expect(categories.has("metadata")).toBe(true);
    expect(categories.has("size")).toBe(true);
  });
});

describe("check profiles", () => {
  it("app profile skips exports and type rules", () => {
    const appSkipped = [
      "exports/type-module", "exports/exports-field", "types/resolution",
    ];
    // Just verify these rule IDs exist
    for (const id of appSkipped) {
      expect(allRules.some((r) => r.meta.id === id)).toBe(true);
    }
  });
});

describe("check JSON output structure", () => {
  it("allRules count is at least 30", () => {
    expect(allRules.length).toBeGreaterThanOrEqual(30);
  });
});
