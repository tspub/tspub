import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

export const defaultLastRule: Rule = {
  meta: {
    id: "exports/default-last",
    description: 'Check that "default" is the last key in every condition map',
    defaultSeverity: "error",
    fixable: "safe",
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports || typeof ctx.pkg.exports === "string") return [];
    const results: RawDiagnostic[] = [];
    const seen = new Set<string>();

    const entries = walkExports(ctx.pkg.exports);
    for (const entry of entries) {
      if (entry.conditionKeys.length === 0) continue;
      const mapKey = `${entry.subpath}:${entry.conditionKeys.join(",")}`;
      if (seen.has(mapKey)) continue;
      seen.add(mapKey);

      const defaultIdx = entry.conditionKeys.indexOf("default");
      if (defaultIdx > -1 && defaultIdx !== entry.conditionKeys.length - 1) {
        results.push({
          severity: "error",
          message: `exports "${entry.subpath}": "default" must be the last condition key`,
        });
      }
    }
    return results;
  },
  fix(ctx) {
    if (!ctx.pkg.exports || typeof ctx.pkg.exports === "string") {
      return { message: "", pkgModified: false };
    }
    let modified = false;

    function reorderDefault(obj: Record<string, unknown>): void {
      const keys = Object.keys(obj);
      const defaultIdx = keys.indexOf("default");
      if (defaultIdx > -1 && defaultIdx !== keys.length - 1) {
        const val = obj["default"];
        delete obj["default"];
        obj["default"] = val;
        modified = true;
      }
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === "object" && val !== null) {
          reorderDefault(val as Record<string, unknown>);
        }
      }
    }

    reorderDefault(ctx.pkg.exports as Record<string, unknown>);
    if (!modified) return { message: "", pkgModified: false };
    return {
      message: 'moved "default" to last position in condition maps',
      pkgModified: true,
    };
  },
};
