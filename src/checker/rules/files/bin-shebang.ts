import { join } from "node:path";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { hasShebang, readFileSafe } from "../utils/format-detection.js";

export const binShebangRule: Rule = {
  meta: {
    id: "files/bin-shebang",
    description: "Check that bin files have a shebang line",
    defaultSeverity: "warning",
    fixable: false,
    category: "files",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    const bin = ctx.pkg.bin;
    if (!bin) return [];
    const results: RawDiagnostic[] = [];

    const entries: [string, string][] =
      typeof bin === "string"
        ? [[ctx.pkg.name ?? "bin", bin]]
        : Object.entries(bin);

    for (const [name, filePath] of entries) {
      const content = readFileSafe(join(ctx.dir, filePath));
      if (content === null) continue;
      if (!hasShebang(content)) {
        results.push({
          severity: "warning",
          message: `bin "${name}" (${filePath}) is missing a shebang (#!/usr/bin/env node)`,
        });
      }
    }
    return results;
  },
};
