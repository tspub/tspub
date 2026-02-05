import type { Rule, RawDiagnostic } from "../../framework/types.js";

/**
 * Detects when a package is only resolvable via dynamic import(), not static import.
 * This happens when exports only has a "require" condition (no "import" or "default"),
 * forcing ESM consumers to use `await import("pkg")` instead of `import pkg from "pkg"`.
 *
 * Equivalent to attw: ESM (dynamic import only)
 */
export const esmDynamicOnlyRule: Rule = {
  meta: {
    id: "types/esm-dynamic-only",
    description: "Detect when package is only available via dynamic import for ESM consumers",
    defaultSeverity: "warning",
    fixable: false,
    category: "types",
  },
  check(ctx) {
    if (!ctx.pkg.exports) return [];
    if (typeof ctx.pkg.exports === "string") return [];

    const results: RawDiagnostic[] = [];
    const exports = ctx.pkg.exports as Record<string, unknown>;

    function checkConditionMap(obj: Record<string, unknown>, subpath: string): void {
      const keys = Object.keys(obj);
      const hasRequire = keys.includes("require");
      const hasImport = keys.includes("import");
      const hasDefault = keys.includes("default");
      const hasModule = keys.includes("module");

      // Only a problem if require exists but no import/default/module
      if (hasRequire && !hasImport && !hasDefault && !hasModule) {
        results.push({
          severity: "warning",
          message: `exports["${subpath}"]: only "require" condition available — ESM consumers must use dynamic import()`,
        });
      }
    }

    const keys = Object.keys(exports);
    const hasSubpaths = keys.some((k) => k.startsWith("."));

    if (hasSubpaths) {
      for (const [subpath, val] of Object.entries(exports)) {
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          checkConditionMap(val as Record<string, unknown>, subpath);
        }
      }
    } else {
      // Sugar form
      checkConditionMap(exports, ".");
    }

    return results;
  },
};
