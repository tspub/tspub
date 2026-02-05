import type { Rule } from "../../framework/types.js";
import { inferEntryPaths } from "../../framework/context.js";

export const dotEntryRule: Rule = {
  meta: {
    id: "exports/dot-entry",
    description: 'Check that exports has a "." entry',
    defaultSeverity: "error",
    fixable: "unsafe",
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports) return [];

    // Top-level string shorthand: "exports": "./dist/index.js"
    if (typeof ctx.pkg.exports === "string") return [];

    const mainExport = ctx.pkg.exports["."];
    if (mainExport) return [];

    const keys = Object.keys(ctx.pkg.exports);
    const hasSubpaths = keys.some((k) => k.startsWith("./"));
    const isConditionMap =
      !hasSubpaths &&
      keys.some((k) =>
        ["types", "import", "require", "default", "node", "browser"].includes(
          k,
        ),
      );

    if (isConditionMap) return []; // sugar form, valid
    if (hasSubpaths) {
      return [
        {
          severity: "info",
          message:
            'exports has subpath entries but no "." — intentional if package has no main entry',
        },
      ];
    }

    return [
      {
        severity: "error",
        message: 'exports missing "." entry',
      },
    ];
  },
  fix(ctx) {
    if (!ctx.pkg.exports || typeof ctx.pkg.exports === "string") {
      return { message: "", pkgModified: false };
    }
    if (ctx.pkg.exports["."]) {
      return { message: "", pkgModified: false };
    }
    const inferred = inferEntryPaths(ctx.pkg, ctx.distFiles);
    if (ctx.pkg.type === "module") {
      ctx.pkg.exports["."] = {
        import: {
          types: inferred.types,
          default: inferred.main,
        },
      };
    } else {
      ctx.pkg.exports["."] = {
        types: inferred.types,
        default: inferred.main,
      };
    }
    return { message: 'added "." entry to exports', pkgModified: true };
  },
};
