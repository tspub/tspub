import type { Rule } from "../../framework/types.js";

/**
 * Warns when "module" field exists but no "exports" field.
 * The "module" field is not standard and not supported by Node.js — prefer exports.
 *
 * Equivalent to publint: HAS_MODULE_BUT_NO_EXPORTS
 */
export const moduleNoExportsRule: Rule = {
  meta: {
    id: "exports/module-no-exports",
    description: 'Warn when "module" field exists but "exports" is missing',
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (ctx.pkg.exports) return [];
    if (!ctx.pkg.module) return [];

    return [
      {
        severity: "warning",
        message: `"module" field is set to "${ctx.pkg.module}" but no "exports" field exists — "module" is not standard; use exports.import instead`,
      },
    ];
  },
};
