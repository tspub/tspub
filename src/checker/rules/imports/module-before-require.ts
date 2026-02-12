import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkImports } from "../utils/imports-traversal.js";

export const importsModuleBeforeRequireRule: Rule = {
  meta: {
    id: "imports/module-before-require",
    description: 'Check that "module" comes before "require" in imports condition maps',
    defaultSeverity: "warning",
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

      const moduleIdx = entry.conditionKeys.indexOf("module");
      const requireIdx = entry.conditionKeys.indexOf("require");
      if (moduleIdx > -1 && requireIdx > -1 && moduleIdx > requireIdx) {
        results.push({
          severity: "warning",
          message: `imports "${entry.key}": "module" should come before "require"`,
        });
      }
    }
    return results;
  },
  fix(ctx) {
    const imports = ctx.pkg.imports as Record<string, unknown> | undefined;
    if (!imports) return { message: "", pkgModified: false };
    let modified = false;

    function reorder(obj: Record<string, unknown>): void {
      const keys = Object.keys(obj);
      const moduleIdx = keys.indexOf("module");
      const requireIdx = keys.indexOf("require");
      if (moduleIdx > -1 && requireIdx > -1 && moduleIdx > requireIdx) {
        const reordered: Record<string, unknown> = {};
        for (const key of keys) {
          if (key === "require") {
            reordered["module"] = obj["module"];
            reordered["require"] = obj["require"];
          } else if (key !== "module") {
            reordered[key] = obj[key];
          }
        }
        for (const key of keys) delete obj[key];
        Object.assign(obj, reordered);
        modified = true;
      }
      for (const key of Object.keys(obj)) {
        if (!key.startsWith("#")) {
          const val = obj[key];
          if (typeof val === "object" && val !== null) {
            reorder(val as Record<string, unknown>);
          }
        }
      }
    }

    for (const key of Object.keys(imports)) {
      if (!key.startsWith("#")) continue;
      const val = imports[key];
      if (typeof val === "object" && val !== null) {
        reorder(val as Record<string, unknown>);
      }
    }
    if (!modified) return { message: "", pkgModified: false };
    return {
      message: 'moved "module" before "require" in imports condition maps',
      pkgModified: true,
    };
  },
};
