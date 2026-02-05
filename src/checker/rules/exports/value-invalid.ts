import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

export const valueInvalidRule: Rule = {
  meta: {
    id: "exports/value-invalid",
    description: "Check that every string value in exports starts with ./",
    defaultSeverity: "error",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports) return [];
    const results: RawDiagnostic[] = [];
    const entries = walkExports(ctx.pkg.exports);
    for (const entry of entries) {
      if (!entry.value.startsWith("./")) {
        results.push({
          severity: "error",
          message: `exports "${entry.subpath}" → "${entry.condition}" value "${entry.value}" must start with "./"`,
        });
      }
    }
    return results;
  },
};
