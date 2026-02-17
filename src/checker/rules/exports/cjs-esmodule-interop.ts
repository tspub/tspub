import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

function hasEsModuleInterop(content: string): boolean {
  return content.includes("__esModule") && content.includes("exports.default");
}

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
    const results: RawDiagnostic[] = [];
    const checked = new Set<string>();

    // Check main/module fields when no exports
    if (!ctx.pkg.exports) {
      const mainPath = ctx.pkg.main;
      if (typeof mainPath === "string" && (mainPath.endsWith(".js") || mainPath.endsWith(".cjs"))) {
        let content: string;
        try {
          content = await readFile(join(ctx.dir, mainPath), "utf-8");
        } catch {
          return results;
        }
        if (hasEsModuleInterop(content)) {
          results.push({
            severity: "warning",
            message: `"${mainPath}" (main) uses __esModule interop pattern which may cause inconsistent behavior across bundlers`,
          });
        }
      }
      return results;
    }

    const entries = walkExports(ctx.pkg.exports as Record<string, unknown>);
    for (const entry of entries) {
      if (entry.condition !== "require" && entry.condition !== "import" && entry.condition !== "default") continue;
      if (!entry.value.endsWith(".js") && !entry.value.endsWith(".cjs")) {
        // Glob patterns like "./cjs/*" don't end with .js but match .js files
        if (!entry.value.includes("*")) continue;
      }

      // Expand glob patterns
      if (entry.value.includes("*")) {
        const globPattern = entry.value.replace(/^\.\//, "");
        const matched = await fg(globPattern, { cwd: ctx.dir });
        for (const file of matched) {
          if (!file.endsWith(".js") && !file.endsWith(".cjs")) continue;
          const filePath = `./${file}`;
          if (checked.has(filePath)) continue;
          checked.add(filePath);

          let content: string;
          try {
            content = await readFile(join(ctx.dir, file), "utf-8");
          } catch {
            continue;
          }
          if (hasEsModuleInterop(content)) {
            results.push({
              severity: "warning",
              message: `exports["${entry.subpath}"].${entry.condition}: "${filePath}" uses __esModule interop pattern which may cause inconsistent behavior across bundlers`,
            });
          }
        }
        continue;
      }

      if (checked.has(entry.value)) continue;
      checked.add(entry.value);

      let content: string;
      try {
        content = await readFile(join(ctx.dir, entry.value), "utf-8");
      } catch {
        continue;
      }

      if (hasEsModuleInterop(content)) {
        results.push({
          severity: "warning",
          message: `exports["${entry.subpath}"].${entry.condition}: "${entry.value}" uses __esModule interop pattern which may cause inconsistent behavior across bundlers`,
        });
      }
    }

    return results;
  },
};
