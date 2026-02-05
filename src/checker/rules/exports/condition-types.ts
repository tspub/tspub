import type { Rule, RawDiagnostic } from "../../framework/types.js";

const JS_CONDITIONS = new Set(["import", "require", "browser", "node", "module", "default"]);

function walkConditions(
  obj: Record<string, unknown>,
  path: string,
  results: RawDiagnostic[],
): void {
  const keys = Object.keys(obj);
  const hasTypes = "types" in obj;

  // Check if this level has any JS condition with a string value (leaf)
  const hasJsLeaf = keys.some(
    (k) => JS_CONDITIONS.has(k) && typeof obj[k] === "string",
  );

  if (hasJsLeaf && !hasTypes) {
    results.push({
      severity: "warning",
      message: `${path} has JS conditions but no "types" condition — TypeScript may not resolve types`,
    });
  }

  // Recurse into nested condition objects
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      walkConditions(
        val as Record<string, unknown>,
        `${path}.${key}`,
        results,
      );
    }
  }
}

export const conditionTypesRule: Rule = {
  meta: {
    id: "exports/condition-types",
    description: "Check that export conditions with JS entries have sibling types",
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports) return [];
    if (typeof ctx.pkg.exports === "string") return [];

    const results: RawDiagnostic[] = [];
    const exports = ctx.pkg.exports as Record<string, unknown>;

    // Determine if top-level is a condition map or subpath map
    const keys = Object.keys(exports);
    const isSubpathMap = keys.some((k) => k.startsWith("."));

    if (isSubpathMap) {
      for (const [subpath, val] of Object.entries(exports)) {
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          walkConditions(
            val as Record<string, unknown>,
            `exports["${subpath}"]`,
            results,
          );
        }
      }
    } else {
      // Sugar form — top level is a condition map
      walkConditions(exports, 'exports["."]', results);
    }

    return results;
  },
};
