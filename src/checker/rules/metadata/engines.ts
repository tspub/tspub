import type { Rule } from "../../framework/types.js";

export const enginesRule: Rule = {
  meta: {
    id: "metadata/engines",
    description: "Check that engines field specifies minimum Node version",
    defaultSeverity: "warning",
    fixable: "unsafe",
    category: "metadata",
  },
  check(ctx) {
    if (!ctx.pkg.engines) {
      return [
        {
          severity: "info",
          message: '"engines" field missing — consider specifying minimum Node version',
        },
      ];
    }
    return [];
  },
  fix(ctx) {
    if (ctx.pkg.engines) {
      return { message: "", pkgModified: false };
    }
    ctx.pkg.engines = { node: ">=18.0.0" };
    return { message: 'set "engines"', pkgModified: true };
  },
};
