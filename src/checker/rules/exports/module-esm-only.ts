import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";
import { getCodeFormat, readFileSafe } from "../utils/format-detection.js";

export const moduleEsmOnlyRule: Rule = {
  meta: {
    id: "exports/module-esm-only",
    description:
      'Check that "module" condition in exports points to ESM content',
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    if (!ctx.pkg.exports) return [];
    const results: RawDiagnostic[] = [];

    const entries = walkExports(ctx.pkg.exports);
    for (const entry of entries) {
      if (entry.condition !== "module") continue;
      const content = readFileSafe(join(ctx.dir, entry.value));
      if (!content) continue;
      const format = getCodeFormat(content);
      if (format === "cjs") {
        results.push({
          severity: "warning",
          message: `exports "${entry.subpath}" → "module" file "${entry.value}" contains CJS syntax, expected ESM`,
        });
      }
    }
    return results;
  },
};
