import type { Rule, RawDiagnostic } from "../../framework/types.js";

/**
 * Checks that "types" is literally the FIRST key in every condition map
 * within the exports field. This is stricter than types-order which only
 * checks relative ordering to import/require/default.
 *
 * Equivalent to publint: EXPORTS_TYPES_SHOULD_BE_FIRST
 */
export const typesFirstRule: Rule = {
  meta: {
    id: "exports/types-first",
    description: 'Check that "types" is the first condition in every condition map',
    defaultSeverity: "error",
    fixable: "safe",
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports) return [];
    if (typeof ctx.pkg.exports === "string") return [];
    const results: RawDiagnostic[] = [];

    // Condition keys that indicate the nested object is a format-specific
    // condition map (import/require/node/browser/etc.), not a top-level
    // condition map where "types" must be first.
    const FORMAT_CONDITIONS = new Set([
      "import", "require", "node", "browser", "default", "bun",
      "react-native", "deno", "worker", "electron",
    ]);

    function checkConditionMap(
      obj: Record<string, unknown>,
      path: string,
      insideFormatCondition: boolean,
    ): void {
      const keys = Object.keys(obj);

      // Only require "types" to be first at the top level of each subpath.
      // Inside import/require conditions, the types-order rule handles ordering.
      if (!insideFormatCondition && keys.includes("types") && keys[0] !== "types") {
        results.push({
          severity: "error",
          message: `${path}: "types" should be the first condition (found at position ${keys.indexOf("types") + 1})`,
        });
      }

      // Recurse into nested condition maps
      for (const key of keys) {
        const val = obj[key];
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          const nested = val as Record<string, unknown>;
          const nestedKeys = Object.keys(nested);
          // Only recurse if it looks like a condition map (not a subpath map)
          if (!nestedKeys.some((k) => k.startsWith("./"))) {
            checkConditionMap(
              nested,
              `${path}.${key}`,
              insideFormatCondition || FORMAT_CONDITIONS.has(key),
            );
          }
        }
      }
    }

    const exports = ctx.pkg.exports as Record<string, unknown>;
    const keys = Object.keys(exports);
    const hasSubpaths = keys.some((k) => k.startsWith("."));

    if (hasSubpaths) {
      for (const [subpath, val] of Object.entries(exports)) {
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          checkConditionMap(val as Record<string, unknown>, `exports["${subpath}"]`, false);
        }
      }
    } else {
      // Sugar form — top-level is the condition map
      checkConditionMap(exports, 'exports["."]', false);
    }

    return results;
  },
  fix(ctx) {
    if (!ctx.pkg.exports || typeof ctx.pkg.exports === "string") {
      return { message: "", pkgModified: false };
    }

    let modified = false;

    function reorderObj(obj: Record<string, unknown>): Record<string, unknown> {
      const keys = Object.keys(obj);
      if (!keys.includes("types") || keys[0] === "types") {
        // Still recurse into nested
        for (const key of keys) {
          const val = obj[key];
          if (typeof val === "object" && val !== null && !Array.isArray(val)) {
            const nested = val as Record<string, unknown>;
            const nestedKeys = Object.keys(nested);
            if (!nestedKeys.some((k) => k.startsWith("./"))) {
              obj[key] = reorderObj(nested);
            }
          }
        }
        return obj;
      }

      const reordered: Record<string, unknown> = { types: obj["types"] };
      for (const key of keys) {
        if (key !== "types") {
          let val = obj[key];
          if (typeof val === "object" && val !== null && !Array.isArray(val)) {
            val = reorderObj(val as Record<string, unknown>);
          }
          reordered[key] = val;
        }
      }
      // Replace in-place
      for (const key of keys) delete obj[key];
      Object.assign(obj, reordered);
      modified = true;
      return obj;
    }

    const exports = ctx.pkg.exports as Record<string, unknown>;
    const keys = Object.keys(exports);
    const hasSubpaths = keys.some((k) => k.startsWith("."));

    if (hasSubpaths) {
      for (const val of Object.values(exports)) {
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          reorderObj(val as Record<string, unknown>);
        }
      }
    } else {
      reorderObj(exports);
    }

    if (!modified) return { message: "", pkgModified: false };
    return {
      message: 'reordered "types" to be first in all condition maps',
      pkgModified: true,
    };
  },
};
