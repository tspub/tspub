import type { Rule } from "../../framework/types.js";
import { inferEntryPaths } from "../../framework/context.js";

export const importConditionRule: Rule = {
  meta: {
    id: "exports/import-condition",
    description: "Check that exports has an import condition",
    defaultSeverity: "error",
    fixable: "unsafe",
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports) return [];

    // Top-level string shorthand: "exports": "./dist/index.js"
    if (typeof ctx.pkg.exports === "string") return [];

    let mainExport = ctx.pkg.exports["."];
    if (!mainExport) {
      // Sugar form check
      const keys = Object.keys(ctx.pkg.exports);
      const isConditionMap =
        !keys.some((k) => k.startsWith("./")) &&
        keys.some((k) =>
          ["types", "import", "require", "default", "node", "browser"].includes(k),
        );
      if (isConditionMap) mainExport = ctx.pkg.exports;
      else return [];
    }

    if (typeof mainExport === "string") return [];
    if (typeof mainExport !== "object" || mainExport === null) return [];

    const mainObj = mainExport as Record<string, unknown>;
    const hasImport = "import" in mainObj;
    const hasTypes = "types" in mainObj;
    const hasDefault = "default" in mainObj;

    // Flat condition map with types/default is valid
    if (!hasImport && (hasTypes || hasDefault)) return [];
    if (hasImport) return [];

    if (mainObj["require"]) {
      return [
        {
          severity: "info",
          message:
            'exports["."] has "require" but no "import" — CJS-only package',
        },
      ];
    }

    return [
      {
        severity: "error",
        message: 'exports["."] missing "import" condition',
      },
    ];
  },
  fix(ctx) {
    if (!ctx.pkg.exports || typeof ctx.pkg.exports === "string") {
      return { message: "", pkgModified: false };
    }
    const mainExport = ctx.pkg.exports["."];
    if (!mainExport || typeof mainExport !== "object") {
      return { message: "", pkgModified: false };
    }
    const mainObj = mainExport as Record<string, unknown>;
    if ("import" in mainObj) {
      return { message: "", pkgModified: false };
    }
    const inferred = inferEntryPaths(ctx.pkg, ctx.distFiles);
    mainObj.import = {
      types: inferred.types,
      default: inferred.main,
    };
    return { message: 'added "import" condition to exports["."]', pkgModified: true };
  },
};
