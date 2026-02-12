import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkImports } from "../utils/imports-traversal.js";
import { getCodeFormat, readFileSafe } from "../utils/format-detection.js";

export const importsModuleEsmOnlyRule: Rule = {
  meta: {
    id: "imports/module-esm-only",
    description: 'Check that "module" condition in imports points to ESM content',
    defaultSeverity: "warning",
    fixable: false,
    category: "imports",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    const imports = ctx.pkg.imports as Record<string, unknown> | undefined;
    if (!imports) return [];
    const results: RawDiagnostic[] = [];

    const entries = walkImports(imports);
    for (const entry of entries) {
      if (entry.condition !== "module") continue;
      if (!entry.value.startsWith("./")) continue;
      const content = readFileSafe(join(ctx.dir, entry.value));
      if (!content) continue;
      const format = getCodeFormat(content);
      if (format === "cjs") {
        results.push({
          severity: "warning",
          message: `imports "${entry.key}" → "module" file "${entry.value}" contains CJS syntax, expected ESM`,
        });
      }
    }
    return results;
  },
};
