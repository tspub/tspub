import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import {
  getExpectedFormat,
  getCodeFormat,
  readFileSafe,
} from "../utils/format-detection.js";

export const allFilesFormatRule: Rule = {
  meta: {
    id: "files/all-files-format",
    description:
      "Check that all JS files match their expected module format (when no exports field)",
    defaultSeverity: "warning",
    fixable: false,
    category: "files",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    // Only applies when exports is not defined — with exports, only exported files matter
    if (ctx.pkg.exports) return [];
    if (ctx.allJsFiles.length === 0) return [];

    const results: RawDiagnostic[] = [];
    const existsCache = new Set<string>();

    for (const relPath of ctx.allJsFiles) {
      const absPath = join(ctx.dir, relPath);
      const content = readFileSafe(absPath);
      if (content === null) continue;

      const actual = getCodeFormat(content);
      if (actual === "unknown" || actual === "mixed") continue;

      const expected = getExpectedFormat(relPath, ctx.pkg.type);
      if (actual === expected) continue;

      // Skip ESM in paths containing "browser" or "bundler" — likely intentional
      if (
        actual === "esm" &&
        (relPath.includes("browser") || relPath.includes("bundler"))
      ) {
        continue;
      }

      // Skip if the "correct extension" counterpart exists — likely intentional
      const ext = relPath.endsWith(".mjs")
        ? ".mjs"
        : relPath.endsWith(".cjs")
          ? ".cjs"
          : ".js";
      const correctExt = actual === "esm" ? ".mjs" : ".cjs";
      if (ext !== correctExt) {
        const counterpart = relPath.slice(0, -ext.length) + correctExt;
        if (!existsCache.has(counterpart)) {
          const counterpartContent = readFileSafe(join(ctx.dir, counterpart));
          if (counterpartContent !== null) {
            existsCache.add(counterpart);
            continue;
          }
        } else {
          continue;
        }
      }

      results.push({
        severity: "warning",
        message: `${relPath} is written in ${actual.toUpperCase()}, but is interpreted as ${expected.toUpperCase()}`,
      });
    }

    return results;
  },
};
