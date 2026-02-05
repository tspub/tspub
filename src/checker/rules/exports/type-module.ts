import type { Rule } from "../../framework/types.js";

export const typeModuleRule: Rule = {
  meta: {
    id: "exports/type-module",
    description: 'Check that type: "module" is set appropriately',
    defaultSeverity: "error",
    fixable: "safe",
    category: "exports",
  },
  check(ctx) {
    const hasEsmExports = hasEsmCondition(ctx.pkg.exports);
    if (ctx.pkg.type === "module") return [];

    if (hasEsmExports) {
      if (hasCjsCondition(ctx.pkg.exports)) {
        return [
          {
            severity: "warning",
            message:
              'package.json missing "type": "module" — dual CJS/ESM package detected, consider setting it explicitly',
          },
        ];
      }
      return [
        {
          severity: "error",
          message:
            'package.json missing "type": "module" but exports use ESM',
        },
      ];
    }

    // If they explicitly set "type": "commonjs", they've made a deliberate choice
    if (ctx.pkg.type === "commonjs") return [];

    return [
      {
        severity: "info",
        message:
          'package.json does not set "type": "module" — consider it for new packages',
      },
    ];
  },
  fix(ctx) {
    // Only fix when exports actually use ESM
    const hasEsm = hasEsmCondition(ctx.pkg.exports);
    if (!hasEsm) return { message: "", pkgModified: false };
    ctx.pkg.type = "module";
    return { message: 'set "type": "module"', pkgModified: true };
  },
};

function hasEsmCondition(
  exports: Record<string, unknown> | string | undefined,
): boolean {
  if (!exports || typeof exports === "string") return false;
  const main = exports["."];
  if (!main || typeof main !== "object") return false;
  return "import" in (main as Record<string, unknown>);
}

function hasCjsCondition(
  exports: Record<string, unknown> | string | undefined,
): boolean {
  if (!exports || typeof exports === "string") return false;
  const main = exports["."];
  if (!main || typeof main !== "object") return false;
  return "require" in (main as Record<string, unknown>);
}
