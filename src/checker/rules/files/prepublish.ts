import type { Rule } from "../../framework/types.js";

export const prepublishRule: Rule = {
  meta: {
    id: "files/prepublish",
    description: "Check that prepublishOnly script exists",
    defaultSeverity: "warning",
    fixable: "safe",
    category: "files",
  },
  check(ctx) {
    if (!ctx.pkg.scripts?.["prepublishOnly"]) {
      return [
        {
          severity: "info",
          message:
            'No "prepublishOnly" script — consider adding one to build before publishing',
        },
      ];
    }
    return [];
  },
  fix(ctx) {
    if (ctx.pkg.scripts?.["prepublishOnly"]) {
      return { message: "", pkgModified: false };
    }
    ctx.pkg.scripts = ctx.pkg.scripts ?? {};
    // Use existing build script if present, otherwise default to tspub
    const buildCmd = ctx.pkg.scripts["build"] ? "npm run build" : "tspub build";
    ctx.pkg.scripts["prepublishOnly"] = buildCmd;
    return { message: "added prepublishOnly script", pkgModified: true };
  },
};
