import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const importsNoDeprecatedSubpathRule: Rule = {
  meta: {
    id: "imports/no-deprecated-subpath",
    description: 'Warn on trailing "/" in imports keys (use /* instead)',
    defaultSeverity: "warning",
    fixable: false,
    category: "imports",
  },
  check(ctx) {
    const imports = ctx.pkg.imports as Record<string, unknown> | undefined;
    if (!imports || typeof imports !== "object") return [];
    const results: RawDiagnostic[] = [];
    for (const key of Object.keys(imports)) {
      if (key.startsWith("#") && key.endsWith("/") && key !== "#/") {
        results.push({
          severity: "warning",
          message: `imports key "${key}" uses deprecated trailing "/" pattern — use "${key}*" instead`,
        });
      }
    }
    return results;
  },
};
