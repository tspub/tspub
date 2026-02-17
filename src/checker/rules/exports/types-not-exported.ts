import type { Rule } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

/**
 * Warns when package.json has a top-level "types" field but no "types"
 * condition in the exports field. This means TypeScript may resolve types
 * via the legacy "types" field but other resolution modes may fail.
 *
 * Equivalent to publint: TYPES_NOT_EXPORTED
 */
export const typesNotExportedRule: Rule = {
  meta: {
    id: "exports/types-not-exported",
    description: 'Check that "types" field is also represented in exports conditions',
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    const typesField = ctx.pkg.types || (ctx.pkg as Record<string, unknown>)["typings"];
    if (!typesField) return [];
    if (!ctx.pkg.exports) return [];
    if (typeof ctx.pkg.exports === "string") return [];

    const entries = walkExports(ctx.pkg.exports);
    const hasTypesCondition = entries.some((e) => e.condition === "types");

    if (!hasTypesCondition) {
      return [
        {
          severity: "warning",
          message: `"types" field is "${typesField}" but no "types" condition found in exports — add a "types" condition to each export for proper resolution`,
        },
      ];
    }

    return [];
  },
};
