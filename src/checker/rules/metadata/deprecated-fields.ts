import type { Rule, RawDiagnostic } from "../../framework/types.js";

const DEPRECATED = ["jsnext:main", "jsnext"] as const;

export const deprecatedFieldsRule: Rule = {
  meta: {
    id: "metadata/deprecated-fields",
    description: "Warn about deprecated package.json fields",
    defaultSeverity: "warning",
    fixable: false,
    category: "metadata",
  },
  check(ctx) {
    const results: RawDiagnostic[] = [];
    for (const field of DEPRECATED) {
      if (ctx.pkg[field] !== undefined) {
        results.push({
          severity: "warning",
          message: `"${field}" is deprecated, use "module" instead`,
        });
      }
    }
    return results;
  },
};
