import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { getExpectedFormat, getCodeFormat, readFileSafe } from "../utils/format-detection.js";

/**
 * Validates that JS files with explicit format extensions (.mjs, .cjs) contain
 * the correct module format. A .mjs file should contain ESM, a .cjs file should
 * contain CJS.
 *
 * This is a standalone check for ALL JS files in the package, not just those
 * referenced in exports. Covers publint: FILE_INVALID_FORMAT and FILE_INVALID_EXPLICIT_FORMAT.
 */
export const formatValidationRule: Rule = {
  meta: {
    id: "files/format-validation",
    description: "Check that .mjs/.cjs files contain the expected module format",
    defaultSeverity: "warning",
    fixable: false,
    category: "files",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    const results: RawDiagnostic[] = [];

    // Check main and module fields
    for (const [field, filePath] of [
      ["main", ctx.pkg.main],
      ["module", ctx.pkg.module],
    ] as const) {
      if (!filePath) continue;
      // Only check files with explicit format extensions
      if (!filePath.endsWith(".mjs") && !filePath.endsWith(".cjs")) continue;

      const content = readFileSafe(join(ctx.dir, filePath));
      if (!content) continue;

      const expected = getExpectedFormat(filePath, ctx.pkg.type);
      const actual = getCodeFormat(content);
      if (actual !== "unknown" && actual !== "mixed" && actual !== expected) {
        results.push({
          severity: "warning",
          message: `"${field}" points to "${filePath}" — expected ${expected.toUpperCase()} (from extension) but file contains ${actual.toUpperCase()}`,
        });
      }
    }

    // Check bin files
    const bin = ctx.pkg.bin;
    if (bin) {
      const entries: [string, string][] =
        typeof bin === "string"
          ? [[ctx.pkg.name ?? "bin", bin]]
          : Object.entries(bin);
      for (const [name, filePath] of entries) {
        if (!filePath.endsWith(".mjs") && !filePath.endsWith(".cjs")) continue;
        const content = readFileSafe(join(ctx.dir, filePath));
        if (!content) continue;
        const expected = getExpectedFormat(filePath, ctx.pkg.type);
        const actual = getCodeFormat(content);
        if (actual !== "unknown" && actual !== "mixed" && actual !== expected) {
          results.push({
            severity: "warning",
            message: `bin "${name}" (${filePath}) — expected ${expected.toUpperCase()} (from extension) but contains ${actual.toUpperCase()}`,
          });
        }
      }
    }

    return results;
  },
};
