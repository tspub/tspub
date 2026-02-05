import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";
import {
  getExpectedFormat,
  getCodeFormat,
  readFileSafe,
} from "../utils/format-detection.js";

export const formatMismatchRule: Rule = {
  meta: {
    id: "exports/format-mismatch",
    description:
      "Check that export file contents match the expected module format",
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    if (!ctx.pkg.exports) return [];
    const results: RawDiagnostic[] = [];
    const checked = new Set<string>();

    const entries = walkExports(ctx.pkg.exports);
    for (const entry of entries) {
      if (!entry.value.endsWith(".js") && !entry.value.endsWith(".mjs") && !entry.value.endsWith(".cjs")) continue;
      if (checked.has(entry.value)) continue;
      checked.add(entry.value);

      const filePath = join(ctx.dir, entry.value);
      const content = readFileSafe(filePath);
      if (!content) continue;

      const actual = getCodeFormat(content);
      if (actual === "unknown") continue;

      // Check condition-based expectations
      if (entry.condition === "import" && actual === "cjs") {
        results.push({
          severity: "warning",
          message: `exports "${entry.subpath}" → "import" file "${entry.value}" contains CJS syntax, expected ESM`,
        });
        continue;
      }
      if (entry.condition === "require" && actual === "esm") {
        results.push({
          severity: "warning",
          message: `exports "${entry.subpath}" → "require" file "${entry.value}" contains ESM syntax, expected CJS`,
        });
        continue;
      }

      // Check extension-based expectations
      const expected = getExpectedFormat(entry.value, ctx.pkg.type);
      if (actual !== "mixed" && actual !== expected) {
        results.push({
          severity: "warning",
          message: `exports "${entry.subpath}" file "${entry.value}" expected ${expected.toUpperCase()} (from extension/type), but contains ${actual.toUpperCase()}`,
        });
      }
    }

    // Check pkg.module field
    if (ctx.pkg.module) {
      const content = readFileSafe(join(ctx.dir, ctx.pkg.module));
      if (content) {
        const actual = getCodeFormat(content);
        if (actual === "cjs") {
          results.push({
            severity: "warning",
            message: `"module" field points to "${ctx.pkg.module}" which contains CJS syntax, expected ESM`,
          });
        }
      }
    }

    return results;
  },
};
