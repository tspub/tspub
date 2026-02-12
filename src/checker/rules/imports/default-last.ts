import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkImports } from "../utils/imports-traversal.js";

export const importsDefaultLastRule: Rule = {
  meta: {
    id: "imports/default-last",
    description: 'Check that "default" is the last key in every imports condition map',
    defaultSeverity: "error",
    fixable: "safe",
    category: "imports",
  },
  check(ctx) {
    const imports = ctx.pkg.imports as Record<string, unknown> | undefined;
    if (!imports) return [];
    const results: RawDiagnostic[] = [];
    const seen = new Set<string>();

    const entries = walkImports(imports);
    for (const entry of entries) {
      if (entry.conditionKeys.length === 0) continue;
      const mapKey = `${entry.key}:${entry.conditionKeys.join(",")}`;
      if (seen.has(mapKey)) continue;
      seen.add(mapKey);

      const defaultIdx = entry.conditionKeys.indexOf("default");
      if (defaultIdx > -1 && defaultIdx !== entry.conditionKeys.length - 1) {
        results.push({
          severity: "error",
          message: `imports "${entry.key}": "default" must be the last condition key`,
        });
      }
    }
    return results;
  },
  fix(ctx) {
    const imports = ctx.pkg.imports as Record<string, unknown> | undefined;
    if (!imports) return { message: "", pkgModified: false };
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
        if (!key.startsWith("#")) {
          const val = obj[key];
          if (typeof val === "object" && val !== null) {
            reorderDefault(val as Record<string, unknown>);
          }
        }
      }
    }

    for (const key of Object.keys(imports)) {
      if (!key.startsWith("#")) continue;
      const val = imports[key];
      if (typeof val === "object" && val !== null) {
        reorderDefault(val as Record<string, unknown>);
      }
    }
    if (!modified) return { message: "", pkgModified: false };
    return {
      message: 'moved "default" to last position in imports condition maps',
      pkgModified: true,
    };
  },
};
