import type { Rule } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";

export const browserValueConflictRule: Rule = {
  meta: {
    id: "exports/browser-value-conflict",
    description: "Detect when exports values are remapped by the browser field",
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    const browser = ctx.pkg["browser"];
    const exports = ctx.pkg.exports;

    // Only applies when browser is an object remap and exports exist
    if (!browser || typeof browser !== "object" || Array.isArray(browser) || !exports) {
      return [];
    }

    const remap = browser as Record<string, string | false>;
    const entries = walkExports(exports as Record<string, unknown>);
    const diagnostics: Array<{ severity: "warning"; message: string }> = [];

    for (const entry of entries) {
      if (entry.value in remap) {
        const target = remap[entry.value];
        const targetDesc = target === false ? "false (disabled)" : `"${target}"`;
        diagnostics.push({
          severity: "warning",
          message: `exports "${entry.subpath}" → "${entry.value}" is remapped by browser field to ${targetDesc}`,
        });
      }
    }

    return diagnostics;
  },
};
