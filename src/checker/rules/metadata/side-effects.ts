import type { Rule } from "../../framework/types.js";

export const sideEffectsRule: Rule = {
  meta: {
    id: "metadata/side-effects",
    description: "Check that sideEffects field is set for tree-shaking",
    defaultSeverity: "warning",
    fixable: false,
    category: "metadata",
  },
  check(ctx) {
    if (ctx.pkg.sideEffects === undefined) {
      return [
        {
          severity: "info",
          message: 'No "sideEffects" field — bundlers can\'t tree-shake',
        },
      ];
    }
    return [];
  },
};
