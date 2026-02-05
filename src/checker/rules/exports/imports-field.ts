import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const importsFieldRule: Rule = {
  meta: {
    id: "exports/imports-field",
    description: "Validate package.json imports field",
    defaultSeverity: "error",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    const imports = ctx.pkg["imports"] as Record<string, unknown> | undefined;
    if (!imports || typeof imports !== "object") return [];
    const results: RawDiagnostic[] = [];

    for (const key of Object.keys(imports)) {
      if (!key.startsWith("#")) {
        results.push({
          severity: "error",
          message: `imports key "${key}" must start with "#"`,
        });
      }
    }

    function checkValues(obj: Record<string, unknown>, path: string): void {
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === "string") {
          if (!val.startsWith("./") && !val.startsWith("#")) {
            results.push({
              severity: "error",
              message: `imports "${path}" → "${key}" value "${val}" must start with "./" or "#"`,
            });
          }
        } else if (typeof val === "object" && val !== null) {
          checkValues(val as Record<string, unknown>, path);
        }
      }
    }

    for (const [key, val] of Object.entries(imports)) {
      if (typeof val === "string") {
        if (!val.startsWith("./") && !val.startsWith("#")) {
          results.push({
            severity: "error",
            message: `imports "${key}" value "${val}" must start with "./" or "#"`,
          });
        }
      } else if (typeof val === "object" && val !== null) {
        checkValues(val as Record<string, unknown>, key);
      }
    }

    return results;
  },
};
