import fg from "fast-glob";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

export const globMatchedFilesRule: Rule = {
  meta: {
    id: "exports/glob-matched-files",
    description:
      "Validate that wildcard patterns in exports match at least one file",
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  async check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    if (!ctx.pkg.exports) return [];
    const results: RawDiagnostic[] = [];
    const checked = new Set<string>();

    const entries = walkExports(ctx.pkg.exports as Record<string, unknown>);
    for (const entry of entries) {
      if (!entry.value.includes("*")) continue;
      if (checked.has(entry.value)) continue;
      checked.add(entry.value);

      const globPattern = entry.value.replace(/^\.\//, "");
      const matched = await fg(globPattern, { cwd: ctx.dir });

      if (matched.length === 0) {
        results.push({
          severity: "warning",
          message: `exports "${entry.subpath}" wildcard pattern "${entry.value}" does not match any files`,
        });
      }
    }

    return results;
  },
};
