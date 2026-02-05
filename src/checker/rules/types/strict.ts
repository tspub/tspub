import type { Rule } from "../../framework/types.js";

export const strictRule: Rule = {
  meta: {
    id: "types/strict",
    description: "Check that strict mode is enabled in tsconfig",
    defaultSeverity: "warning",
    fixable: false,
    category: "types",
  },
  check(ctx) {
    if (!ctx.compilerOptions) return [];
    // Can't know if strict is inherited from an unresolved base config
    if (ctx.hasUnresolvedExtends && !("strict" in ctx.compilerOptions)) return [];
    if (!ctx.compilerOptions["strict"]) {
      return [
        {
          severity: "warning",
          message: 'tsconfig.json: "strict" should be true',
        },
      ];
    }
    return [];
  },
};
