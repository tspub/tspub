import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

export const cjsDefaultExportRule: Rule = {
  meta: {
    id: "exports/cjs-default-export",
    description:
      "Detect CJS-only packages with only a default export and no named exports",
    defaultSeverity: "info",
    fixable: false,
    category: "exports",
  },
  async check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    if (!ctx.pkg.exports) return [];
    const results: RawDiagnostic[] = [];
    const checked = new Set<string>();

    const entries = walkExports(ctx.pkg.exports as Record<string, unknown>);

    // Group entries by subpath to check if there's an "import" condition
    const subpathConditions = new Map<string, Set<string>>();
    for (const entry of entries) {
      if (!subpathConditions.has(entry.subpath)) {
        subpathConditions.set(entry.subpath, new Set());
      }
      subpathConditions.get(entry.subpath)!.add(entry.condition);
    }

    for (const entry of entries) {
      if (entry.condition !== "require") continue;
      if (!entry.value.endsWith(".js") && !entry.value.endsWith(".cjs")) continue;
      if (entry.value.includes("*")) continue;
      if (checked.has(entry.value)) continue;
      checked.add(entry.value);

      // Skip if there's also an "import" condition for this subpath
      const conditions = subpathConditions.get(entry.subpath);
      if (conditions && conditions.has("import")) continue;

      let content: string;
      try {
        content = await readFile(join(ctx.dir, entry.value), "utf-8");
      } catch {
        continue;
      }

      const hasModuleExports = /module\.exports\s*=/.test(content);
      if (!hasModuleExports) continue;

      // Check for named exports (exports.xxx = ...) excluding exports.default and exports.__esModule
      const namedExportMatch = content.match(/exports\.(\w+)\s*=/g);
      const hasNamedExports = namedExportMatch?.some((m) => {
        const name = m.match(/exports\.(\w+)/)?.[1];
        return name !== "default" && name !== "__esModule";
      });

      if (!hasNamedExports) {
        results.push({
          severity: "info",
          message: `"${entry.value}" only has a default export (module.exports) — ESM consumers will only get a default import`,
        });
      }
    }

    return results;
  },
};
