import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

export const fallbackArrayRule: Rule = {
  meta: {
    id: "exports/fallback-array",
    description: "Warn against fallback arrays in exports",
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports) return [];
    const results: RawDiagnostic[] = [];
    const warned = new Set<string>();

    const entries = walkExports(ctx.pkg.exports);
    for (const entry of entries) {
      if (entry.isFallbackArray && !warned.has(entry.subpath)) {
        warned.add(entry.subpath);
        results.push({
          severity: "warning",
          message: `exports "${entry.subpath}" uses a fallback array, which is not recommended and may behave inconsistently across tools`,
        });
      }
    }
    return results;
  },
};
