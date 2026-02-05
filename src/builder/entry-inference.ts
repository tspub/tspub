import { join } from "node:path";
import { fileExists } from "../shared/resolve.js";
import type { PackageJson } from "../shared/package-json.js";

const SRC_EXTENSIONS = [".ts", ".tsx", ".mts"];

/**
 * Try to map a dist path back to a src file.
 * e.g. "./dist/index.js" → "src/index.ts"
 */
function distToSrc(distPath: string): string[] {
  const normalized = distPath
    .replace(/^\.\//, "")
    .replace(/^dist\//, "src/")
    .replace(/\.(js|cjs|mjs)$/, "");
  return SRC_EXTENSIONS.map((ext) => normalized + ext);
}

function collectDistPaths(obj: unknown): string[] {
  const paths: string[] = [];
  if (typeof obj === "string") {
    paths.push(obj);
  } else if (obj && typeof obj === "object") {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      if (typeof val === "string" && (val.endsWith(".js") || val.endsWith(".cjs") || val.endsWith(".mjs"))) {
        paths.push(val);
      } else if (val && typeof val === "object") {
        paths.push(...collectDistPaths(val));
      }
    }
  }
  return paths;
}

export async function inferEntryFromPackageJson(
  pkg: PackageJson,
  dir: string,
): Promise<string[] | null> {
  const distPaths: string[] = [];

  if (pkg.exports) {
    distPaths.push(...collectDistPaths(pkg.exports));
  }
  if (pkg.main) distPaths.push(pkg.main);
  if (pkg.bin) {
    if (typeof pkg.bin === "string") {
      distPaths.push(pkg.bin);
    } else {
      distPaths.push(...Object.values(pkg.bin));
    }
  }

  const seen = new Set<string>();
  const entries: string[] = [];

  for (const distPath of distPaths) {
    const candidates = distToSrc(distPath);
    for (const candidate of candidates) {
      if (seen.has(candidate)) continue;
      if (await fileExists(join(dir, candidate))) {
        seen.add(candidate);
        entries.push(candidate);
        break;
      }
    }
  }

  return entries.length > 0 ? entries : null;
}
