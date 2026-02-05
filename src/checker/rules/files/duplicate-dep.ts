import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const duplicateDepRule: Rule = {
  meta: {
    id: "files/duplicate-dep",
    description: "Check for packages in both dependencies and devDependencies",
    defaultSeverity: "error",
    fixable: false,
    category: "files",
  },
  check(ctx) {
    const results: RawDiagnostic[] = [];
    if (ctx.pkg.dependencies && ctx.pkg.devDependencies) {
      for (const dep of Object.keys(ctx.pkg.devDependencies)) {
        if (dep in ctx.pkg.dependencies) {
          results.push({
            severity: "error",
            message: `"${dep}" is in both dependencies and devDependencies`,
          });
        }
      }
    }
    return results;
  },
};
