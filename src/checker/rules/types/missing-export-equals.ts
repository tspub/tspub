import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";
import { readFileSafe } from "../utils/format-detection.js";

const EXPORT_EQUALS_RE = /\bexport\s*=/;

/**
 * Detects CJS modules whose .d.ts lacks `export =`.
 * When a CJS module uses `module.exports = X`, the types should have `export = X`
 * to correctly represent the module shape for TypeScript consumers.
 *
 * Equivalent to attw: Missing export =
 */
export const missingExportEqualsRule: Rule = {
  meta: {
    id: "types/missing-export-equals",
    description: 'Detect CJS modules whose types lack "export ="',
    defaultSeverity: "info",
    fixable: false,
    category: "types",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    if (!ctx.pkg.exports) return [];
    if (typeof ctx.pkg.exports === "string") return [];

    const results: RawDiagnostic[] = [];
    const entries = walkExports(ctx.pkg.exports);
    const checked = new Set<string>();

    for (const entry of entries) {
      if (entry.condition !== "require") continue;
      const jsPath = entry.value;
      if (!jsPath.endsWith(".js") && !jsPath.endsWith(".cjs")) continue;

      const key = `${entry.subpath}:require`;
      if (checked.has(key)) continue;
      checked.add(key);

      const typesEntry = entries.find(
        (e) => e.subpath === entry.subpath && e.condition === "types",
      );
      if (!typesEntry) continue;

      const jsContent = readFileSafe(join(ctx.dir, jsPath));
      const dtsContent = readFileSafe(join(ctx.dir, typesEntry.value));
      if (!jsContent || !dtsContent) continue;

      // Check if JS uses module.exports = (single export pattern)
      const jsUsesModuleExports = /\bmodule\.exports\s*=/.test(jsContent);
      if (!jsUsesModuleExports) continue;

      // Check if .d.ts has export =
      if (!EXPORT_EQUALS_RE.test(dtsContent)) {
        results.push({
          severity: "info",
          message: `exports["${entry.subpath}"].require: JS uses "module.exports =" but types lack "export =" — may cause resolution issues in Node16 mode`,
        });
      }
    }

    return results;
  },
};
