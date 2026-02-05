import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { getExpectedFormat, readFileSafe, getCodeFormat } from "../utils/format-detection.js";

/**
 * Warns when "main" points to an ESM file but no "exports" field exists.
 * Consumers using older Node.js or tools won't resolve the package correctly.
 *
 * Equivalent to publint: HAS_ESM_MAIN_BUT_NO_EXPORTS
 */
export const esmMainNoExportsRule: Rule = {
  meta: {
    id: "exports/esm-main-no-exports",
    description: 'Warn when "main" is ESM but "exports" is missing',
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (ctx.pkg.exports) return [];
    const main = ctx.pkg.main;
    if (!main) return [];

    const results: RawDiagnostic[] = [];

    // Check by extension
    const expected = getExpectedFormat(main, ctx.pkg.type);
    if (expected === "esm") {
      results.push({
        severity: "warning",
        message: `"main" points to "${main}" (ESM) but no "exports" field exists — add an exports field for proper resolution`,
      });
      return results;
    }

    // Check by content
    if (ctx.hasBuildOutput) {
      const content = readFileSafe(join(ctx.dir, main));
      if (content) {
        const format = getCodeFormat(content);
        if (format === "esm") {
          results.push({
            severity: "warning",
            message: `"main" points to "${main}" which contains ESM syntax but no "exports" field exists — add an exports field`,
          });
        }
      }
    }

    return results;
  },
};
