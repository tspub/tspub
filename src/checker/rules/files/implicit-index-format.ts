import { join } from "node:path";
import type { Rule } from "../../framework/types.js";
import { getCodeFormat, readFileSafe } from "../utils/format-detection.js";

/**
 * Checks that an implicit index.js (when no "main" is specified) matches
 * the declared package type.
 *
 * When package.json has "type": "module", Node.js expects index.js to be ESM.
 * When package.json has "type": "commonjs" (or omitted), it expects CJS.
 *
 * Equivalent to publint: IMPLICIT_INDEX_JS_INVALID_FORMAT
 */
export const implicitIndexFormatRule: Rule = {
  meta: {
    id: "files/implicit-index-format",
    description: "Check that implicit index.js matches the declared package type",
    defaultSeverity: "warning",
    fixable: false,
    category: "files",
  },
  check(ctx) {
    // Only applies when no main/exports are set (Node falls back to index.js)
    if (ctx.pkg.main || ctx.pkg.exports) return [];

    const content = readFileSafe(join(ctx.dir, "index.js"));
    if (!content) return [];

    const actual = getCodeFormat(content);
    if (actual === "unknown" || actual === "mixed") return [];

    const expected = ctx.pkg.type === "module" ? "esm" : "cjs";
    if (actual !== expected) {
      return [
        {
          severity: "warning",
          message: `index.js contains ${actual.toUpperCase()} but package type is "${ctx.pkg.type ?? "commonjs"}" — expected ${expected.toUpperCase()}`,
        },
      ];
    }
    return [];
  },
};
