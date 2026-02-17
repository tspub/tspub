import { join } from "node:path";
import type { Rule } from "../../framework/types.js";
import { getCodeFormat, readFileSafe } from "../utils/format-detection.js";

export const moduleEsmRule: Rule = {
  meta: {
    id: "metadata/module-esm",
    description: 'Check that top-level "module" field points to ESM content',
    defaultSeverity: "warning",
    fixable: false,
    category: "metadata",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    const mod = (ctx.pkg as Record<string, unknown>).module;
    if (typeof mod !== "string") return [];

    const content = readFileSafe(join(ctx.dir, mod));
    if (!content) return [];

    const format = getCodeFormat(content);
    if (format === "cjs") {
      return [
        {
          severity: "warning",
          message: `"module" field "${mod}" contains CJS syntax, expected ESM`,
        },
      ];
    }
    return [];
  },
};
