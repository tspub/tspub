import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { fileExists } from "../../../shared/resolve.js";
import type { Rule, RawDiagnostic } from "../../framework/types.js";

const ANY_PATTERN = /\bany\b/g;
const ANY_IN_TYPE_POSITION = /:\s*any\b|<any\b|any\[\]|any\s*\||\|\s*any\b|=\s*any\b/;
const THRESHOLD = 5;

export const noAnyExportRule: Rule = {
  meta: {
    id: "types/no-any-export",
    description: "Check for excessive `any` types in declaration files",
    defaultSeverity: "warning",
    fixable: false,
    category: "types",
  },
  async check(ctx) {
    if (!ctx.hasBuildOutput) return [];

    const results: RawDiagnostic[] = [];
    const dtsFiles = ctx.distFiles.filter(
      (f) => f.endsWith(".d.ts") || f.endsWith(".d.mts") || f.endsWith(".d.cts"),
    );

    for (const rel of dtsFiles) {
      const fullPath = join(ctx.dir, "dist", rel);
      if (!(await fileExists(fullPath))) continue;

      let content: string;
      try {
        content = await readFile(fullPath, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");
      let anyCount = 0;

      for (const line of lines) {
        if (ANY_IN_TYPE_POSITION.test(line)) {
          const matches = line.match(ANY_PATTERN);
          if (matches) anyCount += matches.length;
        }
      }

      if (anyCount >= THRESHOLD) {
        results.push({
          severity: "warning",
          message: `dist/${rel}: ${anyCount} \`any\` types found in type positions — consider adding explicit types`,
        });
      }
    }

    return results;
  },
};
