import type { Rule } from "../../framework/types.js";

export const isolatedModulesRule: Rule = {
  meta: {
    id: "types/isolated-modules",
    description: "Check that isolatedModules is enabled for bundler compat",
    defaultSeverity: "info",
    fixable: false,
    category: "types",
  },
  check(ctx) {
    if (!ctx.compilerOptions) return [];
    if (!ctx.compilerOptions["isolatedModules"]) {
      return [
        {
          severity: "info",
          message:
            'tsconfig.json: "isolatedModules" should be true for bundler compatibility',
        },
      ];
    }
    return [];
  },
};
