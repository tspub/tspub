import type { Rule } from "../../framework/types.js";

export const browserConflictRule: Rule = {
  meta: {
    id: "exports/browser-conflict",
    description: "Warn when both top-level browser field and exports exist",
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (ctx.pkg["browser"] != null && ctx.pkg.exports != null) {
      return [
        {
          severity: "warning",
          message: `Package has both top-level "browser" field and "exports" — the "browser" field may be ignored by modern bundlers`,
        },
      ];
    }
    return [];
  },
};
