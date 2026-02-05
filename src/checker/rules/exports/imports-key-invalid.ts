import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const importsKeyInvalidRule: Rule = {
  meta: {
    id: "exports/imports-key-invalid",
    description: "Check that all imports field keys start with #",
    defaultSeverity: "error",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    const imports = ctx.pkg["imports"];
    if (!imports || typeof imports !== "object") return [];
    const results: RawDiagnostic[] = [];
    for (const key of Object.keys(imports as Record<string, unknown>)) {
      if (!key.startsWith("#")) {
        results.push({
          severity: "error",
          message: `imports key "${key}" must start with "#"`,
        });
      }
    }
    return results;
  },
};
