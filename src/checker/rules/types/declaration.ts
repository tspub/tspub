import { join } from "node:path";
import { fileExists } from "../../../shared/resolve.js";
import type { Rule } from "../../framework/types.js";

export const declarationRule: Rule = {
  meta: {
    id: "types/declaration",
    description: "Check that declaration is enabled in tsconfig",
    defaultSeverity: "info",
    fixable: false,
    category: "types",
  },
  async check(ctx) {
    if (!ctx.compilerOptions) return [];
    if (ctx.compilerOptions["declaration"]) return [];

    // Skip if .d.ts files already exist on disk
    if (await dtsFilesExist(ctx)) return [];

    return [
      {
        severity: "info",
        message:
          'tsconfig.json: "declaration" should be true for library authoring',
      },
    ];
  },
};

async function dtsFilesExist(ctx: {
  pkg: { types?: string };
  dir: string;
}): Promise<boolean> {
  if (ctx.pkg.types) {
    if (await fileExists(join(ctx.dir, ctx.pkg.types))) return true;
  }
  for (const outDir of ["dist", "lib", "build", "out", "source"]) {
    if (await fileExists(join(ctx.dir, outDir, "index.d.ts"))) return true;
  }
  return false;
}
