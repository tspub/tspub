import fg from "fast-glob";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkImports } from "../utils/imports-traversal.js";

export const importsGlobMatchedFilesRule: Rule = {
  meta: {
    id: "imports/glob-matched-files",
    description: "Validate that wildcard patterns in imports match at least one file",
    defaultSeverity: "warning",
    fixable: false,
    category: "imports",
  },
  async check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    const imports = ctx.pkg.imports as Record<string, unknown> | undefined;
    if (!imports) return [];
    const results: RawDiagnostic[] = [];
    const checked = new Set<string>();

    const entries = walkImports(imports);
    for (const entry of entries) {
      if (!entry.value.startsWith("./")) continue;
      if (!entry.value.includes("*")) continue;
      if (checked.has(entry.value)) continue;
      checked.add(entry.value);

      const globPattern = entry.value.replace(/^\.\//, "");
      const matched = await fg(globPattern, { cwd: ctx.dir });

      if (matched.length === 0) {
        results.push({
          severity: "warning",
          message: `imports "${entry.key}" wildcard pattern "${entry.value}" does not match any files`,
        });
      }
    }

    return results;
  },
};
