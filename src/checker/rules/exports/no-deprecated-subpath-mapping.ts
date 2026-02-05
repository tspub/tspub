import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const noDeprecatedSubpathRule: Rule = {
  meta: {
    id: "exports/no-deprecated-subpath",
    description: "Warn on trailing / in exports keys (use /* instead)",
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports || typeof ctx.pkg.exports !== "object") return [];
    const results: RawDiagnostic[] = [];
    const exports = ctx.pkg.exports as Record<string, unknown>;
    for (const key of Object.keys(exports)) {
      if (key.startsWith(".") && key.endsWith("/") && key !== "./") {
        results.push({
          severity: "warning",
          message: `exports key "${key}" uses deprecated trailing "/" pattern — use "${key}*" instead`,
        });
      }
    }
    return results;
  },
};
