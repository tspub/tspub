import type { Rule } from "../../framework/types.js";

function hasBrowserCondition(value: unknown): boolean {
  if (value == null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if ("browser" in obj) return true;
  for (const v of Object.values(obj)) {
    if (typeof v === "object" && v != null && hasBrowserCondition(v)) return true;
  }
  return false;
}

export const useExportsBrowserRule: Rule = {
  meta: {
    id: "metadata/use-exports-browser",
    description: "Suggest using exports browser condition over top-level browser field",
    defaultSeverity: "info",
    fixable: false,
    category: "metadata",
  },
  check(ctx) {
    if (ctx.pkg["browser"] == null || ctx.pkg.exports == null) return [];
    if (hasBrowserCondition(ctx.pkg.exports)) return [];
    return [
      {
        severity: "info",
        message: `Consider using a "browser" condition in "exports" instead of the top-level "browser" field`,
      },
    ];
  },
};
