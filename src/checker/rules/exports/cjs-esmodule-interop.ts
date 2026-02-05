import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

export const cjsEsmoduleInteropRule: Rule = {
  meta: {
    id: "exports/cjs-esmodule-interop",
    description:
      "Detect CJS files using __esModule interop pattern that may cause inconsistent bundler behavior",
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
      if (entry.condition !== "require") continue;
      if (!entry.value.endsWith(".js") && !entry.value.endsWith(".cjs")) continue;
      if (entry.value.includes("*")) continue;
      if (checked.has(entry.value)) continue;
      checked.add(entry.value);

      let content: string;
      try {
        content = await readFile(join(ctx.dir, entry.value), "utf-8");
      } catch {
        continue;
      }

      if (content.includes("__esModule") && content.includes("exports.default")) {
        results.push({
          severity: "warning",
          message: `"${entry.value}" uses __esModule interop pattern which may cause inconsistent behavior across bundlers`,
        });
      }
    }

    return results;
  },
};
