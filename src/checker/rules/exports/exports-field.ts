import type { Rule } from "../../framework/types.js";
import { inferEntryPaths } from "../../framework/context.js";

export const exportsFieldRule: Rule = {
  meta: {
    id: "exports/exports-field",
    description: "Check that exports field exists in package.json",
    defaultSeverity: "error",
    fixable: "unsafe",
    category: "exports",
  },
  check(ctx) {
    if (ctx.pkg.exports !== undefined && ctx.pkg.exports !== null) return [];

    // CLI-only packages (has bin but no main/module/types) don't need exports
    if (ctx.pkg.bin && !ctx.pkg.main && !ctx.pkg.module && !ctx.pkg.types) {
      return [];
    }

    if (ctx.pkg.main || ctx.pkg.module || ctx.pkg.types) {
      if (ctx.pkg.typesVersions) {
        return [
          {
            severity: "info",
            message:
              'No "exports" field — using typesVersions with main/types (valid legacy pattern)',
          },
        ];
      }
      return [
        {
          severity: "info",
          message:
            'No "exports" field — consider adding it for modern resolution',
        },
      ];
    }

    return [
      {
        severity: "warning",
        message: 'package.json missing "exports" field',
      },
    ];
  },
  fix(ctx) {
    if (ctx.pkg.exports) return { message: "", pkgModified: false };

    const inferred = inferEntryPaths(ctx.pkg, ctx.distFiles);
    const mainFile = inferred.main;
    const typesFile = inferred.types;

    if (ctx.pkg.type === "module") {
      ctx.pkg.exports = {
        ".": {
          import: {
            types: typesFile,
            default: mainFile,
          },
        },
      };
    } else {
      ctx.pkg.exports = {
        ".": {
          types: typesFile,
          default: mainFile,
        },
      };
    }
    return { message: "added exports field", pkgModified: true };
  },
};
