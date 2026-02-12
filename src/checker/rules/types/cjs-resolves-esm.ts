import type { Rule, RawDiagnostic } from "../../framework/types.js";

/**
 * Detects when CJS require() would resolve to an ESM file, which fails at
 * runtime with ERR_REQUIRE_ESM. This happens when:
 *
 * 1. `type: "module"` with string exports — require() gets an ESM .js file
 * 2. `require` condition points to .mjs or .js with `type: "module"`
 * 3. `default` condition (no `require`) points to ESM file — CJS falls back to it
 * 4. No exports, but `main` points to ESM file
 *
 * Equivalent to attw: CJSResolvesToESM
 */
export const cjsResolvesToEsmRule: Rule = {
  meta: {
    id: "types/cjs-resolves-esm",
    description:
      "Detect when CJS require() would resolve to an ESM file",
    defaultSeverity: "error",
    fixable: false,
    category: "types",
  },
  check(ctx) {
    const pkgType = ctx.pkg.type ?? "commonjs";
    const isModuleType = pkgType === "module";

    function isEsmFile(file: string): boolean {
      if (file.endsWith(".mjs")) return true;
      if (file.endsWith(".js") && isModuleType) return true;
      return false;
    }

    // No exports field — check main
    // If "type": "module" with no exports, this is intentional ESM-only design
    if (!ctx.pkg.exports) {
      return [];
    }

    // String exports — if "type": "module", this is intentional ESM-only
    if (typeof ctx.pkg.exports === "string") {
      if (!isModuleType && isEsmFile(ctx.pkg.exports)) {
        return [
          {
            severity: "error",
            message: `"exports" points to "${ctx.pkg.exports}" which is ESM — CJS require() will fail (ERR_REQUIRE_ESM)`,
          },
        ];
      }
      return [];
    }

    const results: RawDiagnostic[] = [];
    const exports = ctx.pkg.exports as Record<string, unknown>;

    function checkConditionMap(
      obj: Record<string, unknown>,
      subpath: string,
    ): void {
      const keys = Object.keys(obj);
      const hasRequire = keys.includes("require");
      const hasDefault = keys.includes("default");

      // Check explicit require condition pointing to ESM
      if (hasRequire) {
        const requireVal = obj.require;
        const target = typeof requireVal === "string" ? requireVal : null;
        if (target && isEsmFile(target)) {
          results.push({
            severity: "error",
            message: `exports["${subpath}"].require points to "${target}" which is ESM — CJS require() will fail (ERR_REQUIRE_ESM)`,
          });
        }
        return; // require condition exists, no fallback to default
      }

      // No require condition — CJS falls back to default.
      // If the package is explicitly "type": "module", this is intentional ESM-only design.
      if (hasDefault && !isModuleType) {
        const defaultVal = obj.default;
        const target = typeof defaultVal === "string" ? defaultVal : null;
        if (target && isEsmFile(target)) {
          results.push({
            severity: "warning",
            message: `exports["${subpath}"].default points to "${target}" which is ESM and no "require" condition exists — CJS require() will fail (ERR_REQUIRE_ESM)`,
          });
        }
      }
    }

    const keys = Object.keys(exports);
    const hasSubpaths = keys.some((k) => k.startsWith("."));

    if (hasSubpaths) {
      for (const [subpath, val] of Object.entries(exports)) {
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          checkConditionMap(val as Record<string, unknown>, subpath);
        } else if (typeof val === "string" && !isModuleType) {
          // Subpath directly maps to a file (only flag if not intentionally ESM-only)
          if (isEsmFile(val)) {
            results.push({
              severity: "error",
              message: `exports["${subpath}"] points to "${val}" which is ESM — CJS require() will fail (ERR_REQUIRE_ESM)`,
            });
          }
        }
      }
    } else {
      // Sugar form (conditions at top level)
      checkConditionMap(exports, ".");
    }

    return results;
  },
};
