import type { Rule } from "../../framework/types.js";

const VALID_MODULE_VALUES = new Set([
  "nodenext",
  "node16",
  "esnext",
  "es2022",
  "es2020",
  "preserve",
]);
const OUTDATED_MODULE_VALUES = new Set([
  "commonjs",
  "amd",
  "umd",
  "system",
]);

export const moduleRule: Rule = {
  meta: {
    id: "types/module",
    description: "Check tsconfig module setting",
    defaultSeverity: "warning",
    fixable: false,
    category: "types",
  },
  check(ctx) {
    if (!ctx.compilerOptions) return [];
    const moduleVal = String(ctx.compilerOptions["module"] ?? "").toLowerCase();

    if (OUTDATED_MODULE_VALUES.has(moduleVal)) {
      return [
        {
          severity: "warning",
          message: `tsconfig.json: "module" is "${ctx.compilerOptions["module"]}" — consider "NodeNext" or "ESNext" for modern output`,
        },
      ];
    }
    if (ctx.compilerOptions["module"] && !VALID_MODULE_VALUES.has(moduleVal)) {
      return [
        {
          severity: "info",
          message: `tsconfig.json: "module" is "${ctx.compilerOptions["module"]}" — "NodeNext" is recommended for libraries`,
        },
      ];
    }
    if (!ctx.compilerOptions["module"]) {
      return [
        {
          severity: "info",
          message: 'tsconfig.json: "module" is not set — consider "NodeNext"',
        },
      ];
    }
    return [];
  },
};
