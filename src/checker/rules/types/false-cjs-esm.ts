import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";
import {
  getExpectedFormat,
  getCodeFormat,
  readFileSafe,
} from "../utils/format-detection.js";

/**
 * Detects FalseCJS and FalseESM: when a .d.ts file declares one module format
 * but the corresponding JS file contains a different format.
 *
 * - FalseCJS: Types say CJS but JS is actually ESM
 * - FalseESM: Types say ESM but JS is actually CJS
 *
 * Equivalent to attw: FalseCJS, FalseESM
 */
export const falseCjsEsmRule: Rule = {
  meta: {
    id: "types/false-cjs-esm",
    description: "Detect format mismatch between declaration files and JS files (FalseCJS/FalseESM)",
    defaultSeverity: "error",
    fixable: false,
    category: "types",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    if (!ctx.pkg.exports) return [];
    if (typeof ctx.pkg.exports === "string") return [];

    const results: RawDiagnostic[] = [];
    const entries = walkExports(ctx.pkg.exports);
    const pkgType = ctx.pkg.type ?? "commonjs";
    const checked = new Set<string>();

    for (const entry of entries) {
      // Find pairs of types + JS files for the same condition
      if (entry.condition === "types") continue;
      const key = `${entry.subpath}:${entry.condition}`;
      if (checked.has(key)) continue;
      checked.add(key);

      const jsPath = entry.value;
      if (!jsPath.endsWith(".js") && !jsPath.endsWith(".mjs") && !jsPath.endsWith(".cjs")) continue;

      // Find the corresponding types entry for this subpath
      const typesEntry = entries.find(
        (e) => e.subpath === entry.subpath && e.condition === "types",
      );
      if (!typesEntry) continue;
      const dtsPath = typesEntry.value;

      const jsContent = readFileSafe(join(ctx.dir, jsPath));
      if (!jsContent) continue;

      const jsFormat = getCodeFormat(jsContent);
      if (jsFormat === "unknown" || jsFormat === "mixed") continue;

      // Determine what format the .d.ts is declaring
      let declaredFormat: "esm" | "cjs";
      if (dtsPath.endsWith(".d.mts")) {
        declaredFormat = "esm";
      } else if (dtsPath.endsWith(".d.cts")) {
        declaredFormat = "cjs";
      } else {
        // .d.ts — format depends on package type
        declaredFormat = pkgType === "module" ? "esm" : "cjs";
      }

      if (declaredFormat === "cjs" && jsFormat === "esm") {
        results.push({
          severity: "error",
          message: `exports["${entry.subpath}"].${entry.condition}: FalseCJS — types "${dtsPath}" declare CJS but "${jsPath}" contains ESM`,
        });
      } else if (declaredFormat === "esm" && jsFormat === "cjs") {
        results.push({
          severity: "error",
          message: `exports["${entry.subpath}"].${entry.condition}: FalseESM — types "${dtsPath}" declare ESM but "${jsPath}" contains CJS`,
        });
      }
    }

    return results;
  },
};
