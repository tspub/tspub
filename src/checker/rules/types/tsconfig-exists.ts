import { join } from "node:path";
import { fileExists } from "../../../shared/resolve.js";
import type { Rule } from "../../framework/types.js";

export const tsconfigExistsRule: Rule = {
  meta: {
    id: "types/tsconfig-exists",
    description: "Check that tsconfig.json exists",
    defaultSeverity: "warning",
    fixable: false,
    category: "types",
  },
  async check(ctx) {
    if (ctx.compilerOptions !== null) return [];

    // tsconfig doesn't exist or couldn't be parsed
    const tsconfigPath = join(ctx.dir, "tsconfig.json");
    if (!(await fileExists(tsconfigPath))) {
      // If type declarations exist, this is likely a published package or hand-written .d.ts
      if (ctx.pkg.types && (await fileExists(join(ctx.dir, ctx.pkg.types)))) {
        return [
          {
            severity: "info",
            message:
              "tsconfig.json not found (hand-written declarations detected)",
          },
        ];
      }
      // Check if any .d.ts files exist (published package with types)
      if (ctx.hasBuildOutput || ctx.distFiles.length > 0) {
        return [
          {
            severity: "info",
            message: "tsconfig.json not found (published package — this is normal)",
          },
        ];
      }
      return [
        { severity: "info", message: "tsconfig.json not found" },
      ];
    }

    // File exists but couldn't be parsed
    return [
      { severity: "warning", message: "Could not parse tsconfig.json" },
    ];
  },
};
