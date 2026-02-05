import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";
import { readFileSafe, hasCJSSyntax } from "../utils/format-detection.js";

const EXPORT_DEFAULT_RE = /\bexport\s+default\b/;
const MODULE_EXPORTS_RE = /\bmodule\.exports\s*=/;

/**
 * Detects FalseExportDefault: when the .d.ts has `export default` but
 * the JS file uses `module.exports =` without __esModule interop.
 * This causes different behavior in Node.js vs bundlers.
 *
 * Equivalent to attw: FalseExportDefault
 */
export const falseExportDefaultRule: Rule = {
  meta: {
    id: "types/false-export-default",
    description: "Detect export default in types with module.exports in JS (FalseExportDefault)",
    defaultSeverity: "warning",
    fixable: false,
    category: "types",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    if (!ctx.pkg.exports) return [];
    if (typeof ctx.pkg.exports === "string") return [];

    const results: RawDiagnostic[] = [];
    const entries = walkExports(ctx.pkg.exports);

    for (const entry of entries) {
      if (entry.condition !== "require" && entry.condition !== "default") continue;
      const jsPath = entry.value;
      if (!jsPath.endsWith(".js") && !jsPath.endsWith(".cjs")) continue;

      // Find types for this subpath
      const typesEntry = entries.find(
        (e) => e.subpath === entry.subpath && e.condition === "types",
      );
      if (!typesEntry) continue;

      const dtsContent = readFileSafe(join(ctx.dir, typesEntry.value));
      const jsContent = readFileSafe(join(ctx.dir, jsPath));
      if (!dtsContent || !jsContent) continue;

      const dtsHasDefault = EXPORT_DEFAULT_RE.test(dtsContent);
      const jsHasModuleExports = MODULE_EXPORTS_RE.test(jsContent);
      const jsHasEsModuleFlag = jsContent.includes("__esModule");

      if (dtsHasDefault && jsHasModuleExports && !jsHasEsModuleFlag) {
        results.push({
          severity: "warning",
          message: `exports["${entry.subpath}"].${entry.condition}: types have "export default" but JS uses "module.exports =" without __esModule — consumers may get { default: ... } wrapper`,
        });
      }
    }

    return results;
  },
};
