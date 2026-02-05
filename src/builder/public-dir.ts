import { cp, access } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../shared/logger.js";

/**
 * Copy contents of publicDir into outDir.
 * Similar to Vite's publicDir — static assets copied as-is.
 */
export async function copyPublicDir(dir: string, publicDir: string, outDir: string): Promise<void> {
  const srcPath = join(dir, publicDir);
  const destPath = join(dir, outDir);

  try {
    await access(srcPath);
  } catch {
    // publicDir doesn't exist — skip silently
    return;
  }

  try {
    await cp(srcPath, destPath, { recursive: true, force: true });
    logger.dim(`Copied ${publicDir}/ → ${outDir}/`);
  } catch (err) {
    logger.warn(
      `Failed to copy publicDir: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
