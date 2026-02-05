import type { Rule } from "../../framework/types.js";

const VALID_MODULE_RESOLUTION_VALUES = new Set([
  "nodenext",
  "node16",
  "bundler",
]);
const OUTDATED_MODULE_RESOLUTION_VALUES = new Set([
  "classic",
  "node",
  "node10",
]);

export const moduleResolutionRule: Rule = {
  meta: {
    id: "types/module-resolution",
    description: "Check tsconfig moduleResolution setting",
    defaultSeverity: "warning",
    fixable: false,
    category: "types",
  },
  check(ctx) {
    if (!ctx.compilerOptions) return [];
    const mrVal = String(
      ctx.compilerOptions["moduleResolution"] ?? "",
    ).toLowerCase();

    if (OUTDATED_MODULE_RESOLUTION_VALUES.has(mrVal)) {
      return [
        {
          severity: "warning",
          message: `tsconfig.json: "moduleResolution" is "${ctx.compilerOptions["moduleResolution"]}" — consider "NodeNext" or "Bundler"`,
        },
      ];
    }
    if (
      ctx.compilerOptions["moduleResolution"] &&
      !VALID_MODULE_RESOLUTION_VALUES.has(mrVal)
    ) {
      return [
        {
          severity: "info",
          message: `tsconfig.json: "moduleResolution" is "${ctx.compilerOptions["moduleResolution"]}" — "NodeNext" is recommended`,
        },
      ];
    }
    return [];
  },
};
