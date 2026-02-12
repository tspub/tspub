import type { Rule, RawDiagnostic } from "../../framework/types.js";

const STRING_FIELDS = ["main", "module", "types", "typings", "jsnext:main"];

export const fieldValueTypeRule: Rule = {
  meta: {
    id: "metadata/field-value-type",
    description: "Check that common package.json fields have correct value types",
    defaultSeverity: "error",
    fixable: false,
    category: "metadata",
  },
  check(ctx) {
    const results: RawDiagnostic[] = [];
    const pkg = ctx.pkg as Record<string, unknown>;

    for (const field of STRING_FIELDS) {
      const val = pkg[field];
      if (val !== undefined && typeof val !== "string") {
        results.push({
          severity: "error",
          message: `"${field}" must be a string, got ${typeof val}`,
        });
      }
    }

    // "browser" can be a string (entry alias) or an object (file replacement map)
    const browser = pkg["browser"];
    if (browser !== undefined && typeof browser !== "string" && typeof browser !== "object") {
      results.push({
        severity: "error",
        message: `"browser" must be a string or object, got ${typeof browser}`,
      });
    }

    return results;
  },
};
