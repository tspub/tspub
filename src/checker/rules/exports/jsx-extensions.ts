import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

const INVALID_EXTENSIONS = [".cjsx", ".mjsx", ".ctsx", ".mtsx"];

export const jsxExtensionsRule: Rule = {
  meta: {
    id: "exports/jsx-extensions",
    description: "Check that exports don't use invalid JSX extensions",
    defaultSeverity: "error",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports) return [];
    const results: RawDiagnostic[] = [];
    const entries = walkExports(ctx.pkg.exports);
    for (const entry of entries) {
      for (const ext of INVALID_EXTENSIONS) {
        if (entry.value.endsWith(ext)) {
          results.push({
            severity: "error",
            message: `exports "${entry.subpath}" → "${entry.condition}" uses invalid extension "${ext}"`,
          });
        }
      }
    }
    return results;
  },
};
