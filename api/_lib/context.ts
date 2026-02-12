import type { PackageJson } from "../../src/shared/package-json.js";
import type { CheckContext } from "../../src/checker/framework/types.js";

const PUBLISH_CONFIG_FIELDS = [
  "exports", "main", "module", "types", "bin", "files", "type", "browser", "typings",
] as const;

function applyPublishConfig(pkg: PackageJson): void {
  const pc = pkg.publishConfig;
  if (!pc || typeof pc !== "object") return;
  const config = pc as Record<string, unknown>;
  for (const field of PUBLISH_CONFIG_FIELDS) {
    if (field in config) {
      (pkg as Record<string, unknown>)[field] = config[field];
    }
  }
}

function stripJsonComments(raw: string): string {
  return raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

export function buildContextFromTarball(
  pkgRaw: Record<string, unknown>,
  files: Map<string, string>,
): CheckContext {
  const pkg = pkgRaw as PackageJson;
  applyPublishConfig(pkg);

  // Resolve tsconfig compiler options from tarball files
  let compilerOptions: Record<string, unknown> | null = null;
  let hasUnresolvedExtends = false;
  const tsconfigRaw = files.get("tsconfig.json");
  if (tsconfigRaw) {
    try {
      const tsconfig = JSON.parse(stripJsonComments(tsconfigRaw)) as {
        extends?: string;
        compilerOptions?: Record<string, unknown>;
      };
      compilerOptions = tsconfig.compilerOptions ?? {};
      if (tsconfig.extends) {
        // In a tarball we can't follow extends chains into node_modules
        hasUnresolvedExtends = true;
      }
    } catch {
      // Invalid tsconfig — leave null
    }
  }

  // Build distFiles list from tarball entries
  const outDir = (compilerOptions?.["outDir"] as string | undefined) ?? "dist";
  const distFiles: string[] = [];
  const allJsFiles: string[] = [];
  for (const name of files.keys()) {
    if (name.startsWith(outDir + "/")) {
      distFiles.push(name.slice(outDir.length + 1));
    }
    if (/\.(js|mjs|cjs)$/.test(name)) {
      allJsFiles.push(name);
    }
  }

  // Detect build output
  const hasBuildOutput = distFiles.length > 0 ||
    [...files.keys()].some((f) =>
      f.startsWith("dist/") || f.startsWith("lib/") ||
      f.startsWith("build/") || f.startsWith("out/")
    );

  return {
    pkg,
    dir: "/virtual",
    compilerOptions,
    hasBuildOutput,
    distFiles,
    allJsFiles,
    hasUnresolvedExtends,
  };
}
