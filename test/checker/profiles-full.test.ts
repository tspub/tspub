import { describe, it, expect } from "vitest";
import {
  PROFILES,
  ALLOW_LIST_PROFILES,
  RULE_MAPPING,
  CATEGORY_ORDER,
  parseSeverityOverrides,
} from "../../src/checker/profiles.js";
import { allRules } from "../../src/checker/rules/index.js";

describe("PROFILES", () => {
  it("strict profile has empty array", () => {
    expect(PROFILES.strict).toEqual([]);
  });

  it("library profile skips size/package-size", () => {
    expect(PROFILES.library).toContain("size/package-size");
  });

  it("app profile is an allow-list", () => {
    expect(ALLOW_LIST_PROFILES.has("app")).toBe(true);
  });

  it("all rule IDs in app profile are valid rule IDs", () => {
    const knownIds = new Set(allRules.map((r) => r.meta.id));
    for (const id of PROFILES.app!) {
      expect(knownIds.has(id), `"${id}" should be a valid rule ID`).toBe(true);
    }
  });
});

describe("RULE_MAPPING", () => {
  it("has entry for exports/type-module", () => {
    expect(RULE_MAPPING["exports/type-module"]).toBeDefined();
  });

  it("publint mapping exists for key exports rules", () => {
    expect(RULE_MAPPING["exports/exports-field"]?.publint).toBe("HAS_ESM_MAIN_BUT_NO_EXPORTS");
    expect(RULE_MAPPING["exports/dot-entry"]?.publint).toBe("EXPORTS_MISSING_ROOT_ENTRYPOINT");
    expect(RULE_MAPPING["exports/types-order"]?.publint).toBe("EXPORTS_TYPES_SHOULD_BE_FIRST");
  });

  it("attw mapping exists for types rules", () => {
    expect(RULE_MAPPING["types/false-cjs-esm"]?.attw).toBe("FalseCJS / FalseESM");
  });

  it("exports/browser-value-conflict maps to EXPORTS_VALUE_CONFLICTS_WITH_BROWSER", () => {
    expect(RULE_MAPPING["exports/browser-value-conflict"]?.publint).toBe(
      "EXPORTS_VALUE_CONFLICTS_WITH_BROWSER",
    );
  });
});

describe("parseSeverityOverrides", () => {
  it("parses rule=error correctly", () => {
    const result = parseSeverityOverrides(["my-rule=error"]);
    expect(result).toEqual({ "my-rule": "error" });
  });

  it("parses rule=warning correctly", () => {
    const result = parseSeverityOverrides(["my-rule=warning"]);
    expect(result).toEqual({ "my-rule": "warning" });
  });

  it("parses rule=off correctly", () => {
    const result = parseSeverityOverrides(["my-rule=off"]);
    expect(result).toEqual({ "my-rule": "off" });
  });

  it("ignores invalid severity values", () => {
    const result = parseSeverityOverrides(["my-rule=foo"]);
    expect(result).toEqual({});
  });

  it("ignores specs without = sign", () => {
    const result = parseSeverityOverrides(["no-equals-here"]);
    expect(result).toEqual({});
  });

  it("handles multiple specs", () => {
    const result = parseSeverityOverrides([
      "rule-a=error",
      "rule-b=warning",
      "rule-c=off",
    ]);
    expect(result).toEqual({
      "rule-a": "error",
      "rule-b": "warning",
      "rule-c": "off",
    });
  });

  it("handles whitespace around = sign", () => {
    const result = parseSeverityOverrides(["my-rule = error"]);
    expect(result).toEqual({ "my-rule": "error" });
  });
});

describe("CATEGORY_ORDER", () => {
  it("contains all expected categories", () => {
    expect(CATEGORY_ORDER).toContain("exports");
    expect(CATEGORY_ORDER).toContain("imports");
    expect(CATEGORY_ORDER).toContain("types");
    expect(CATEGORY_ORDER).toContain("files");
    expect(CATEGORY_ORDER).toContain("metadata");
    expect(CATEGORY_ORDER).toContain("size");
  });
});
