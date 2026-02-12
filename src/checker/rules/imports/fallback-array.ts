import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkImports } from "../utils/imports-traversal.js";

export const importsFallbackArrayRule: Rule = {
  meta: {
    id: "imports/fallback-array",
    description: "Warn against fallback arrays in imports",
    defaultSeverity: "warning",
    fixable: false,
    category: "imports",
  },
  check(ctx) {
    const imports = ctx.pkg.imports as Record<string, unknown> | undefined;
    if (!imports) return [];
    const results: RawDiagnostic[] = [];
    const warned = new Set<string>();

    const entries = walkImports(imports);
    for (const entry of entries) {
      if (entry.isFallbackArray && !warned.has(entry.key)) {
        warned.add(entry.key);
        results.push({
          severity: "warning",
          message: `imports "${entry.key}" uses a fallback array, which is not recommended and may behave inconsistently across tools`,
        });
      }
    }
    return results;
  },
};
