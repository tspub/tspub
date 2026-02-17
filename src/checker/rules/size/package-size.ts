import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileExists } from "../../../shared/resolve.js";
import type { Rule } from "../../framework/types.js";

export const packageSizeRule: Rule = {
  meta: {
    id: "size/package-size",
    description: "Check that package dist size is reasonable",
    defaultSeverity: "warning",
    fixable: false,
    category: "size",
  },
  async check(ctx) {
    const distDir = join(ctx.dir, "dist");
    if (!(await fileExists(distDir))) return [];

    const filesField = ctx.pkg.files as string[] | undefined;
    const totalSize = await getPublishedSize(ctx.dir, distDir, filesField);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(1);

    if (totalSize > 10 * 1024 * 1024) {
      return [
        {
          severity: "error" as const,
          message: `Package size is very large: ${sizeMB}MB — investigate what's being bundled`,
        },
      ];
    }
    if (totalSize > 1024 * 1024) {
      return [
        {
          severity: "warning" as const,
          message: `Package size: ${sizeMB}MB — consider reducing`,
        },
      ];
    }
    return [];
  },
};

/**
 * Measure the size of files that would actually be published,
 * respecting the "files" field in package.json.
 */
async function getPublishedSize(
  rootDir: string,
  dirPath: string,
  filesField: string[] | undefined,
): Promise<number> {
  let total = 0;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getPublishedSize(rootDir, fullPath, filesField);
      } else {
        if (filesField && !isIncludedByFiles(rootDir, fullPath, filesField)) {
          continue;
        }
        const s = await stat(fullPath);
        total += s.size;
      }
    }
  } catch {
    // ignore
  }
  return total;
}

/**
 * Check if a file path is included by the package.json "files" field.
 * Handles common patterns: directory names, exact files, and simple globs.
 */
function isIncludedByFiles(rootDir: string, filePath: string, filesField: string[]): boolean {
  const rel = relative(rootDir, filePath);
  let included = false;
  for (const pattern of filesField) {
    if (pattern.startsWith("!")) {
      if (matchPattern(rel, pattern.slice(1))) included = false;
    } else {
      if (matchPattern(rel, pattern) || rel.startsWith(pattern + "/")) included = true;
    }
  }
  return included;
}

/** Simple glob matcher for common files-field patterns (no external deps). */
function matchPattern(filePath: string, pattern: string): boolean {
  // Convert glob pattern to regex: * → [^/]*, ** → .*, ? → [^/]
  const re = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "\uFFFF")
        .replace(/\*/g, "[^/]*")
        .replace(/\uFFFF/g, ".*")
        .replace(/\?/g, "[^/]") +
      "$",
  );
  return re.test(filePath);
}
