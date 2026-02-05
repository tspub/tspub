import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
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

    const totalSize = await getDirectorySize(distDir);
    const sizeKB = Math.round(totalSize / 1024);
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
    // ok case handled by the adapter layer
    return [];
  },
};

async function getDirectorySize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirectorySize(fullPath);
      } else {
        const s = await stat(fullPath);
        total += s.size;
      }
    }
  } catch {
    // ignore
  }
  return total;
}
