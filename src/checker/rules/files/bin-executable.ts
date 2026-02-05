import { join } from "node:path";
import { statSync } from "node:fs";
import type { Rule, RawDiagnostic } from "../../framework/types.js";

/**
 * Checks that bin files have the executable permission bit set.
 * A file with a shebang but no +x permission will fail to run directly.
 *
 * Equivalent to publint: BIN_FILE_NOT_EXECUTABLE
 */
export const binExecutableRule: Rule = {
  meta: {
    id: "files/bin-executable",
    description: "Check that bin files have executable permissions",
    defaultSeverity: "warning",
    fixable: false,
    category: "files",
  },
  check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    const bin = ctx.pkg.bin;
    if (!bin) return [];
    // Skip on Windows where permissions work differently
    if (process.platform === "win32") return [];

    const results: RawDiagnostic[] = [];
    const entries: [string, string][] =
      typeof bin === "string"
        ? [[ctx.pkg.name ?? "bin", bin]]
        : Object.entries(bin);

    for (const [name, filePath] of entries) {
      try {
        const stats = statSync(join(ctx.dir, filePath));
        // Check if owner execute bit is set (0o100)
        const isExecutable = (stats.mode & 0o111) !== 0;
        if (!isExecutable) {
          results.push({
            severity: "warning",
            message: `bin "${name}" (${filePath}) is not executable — run: chmod +x ${filePath}`,
          });
        }
      } catch {
        // File doesn't exist — handled by file-exists rule
      }
    }
    return results;
  },
};
