import { join, dirname } from "node:path";
import { readFile, readdir } from "node:fs/promises";
import type { PackageJson } from "../../shared/package-json.js";
import { fileExists } from "../../shared/resolve.js";
import { stripJsonComments } from "../../shared/strip-json-comments.js";
import type { CheckContext } from "./types.js";

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

export async function buildContext(
  pkg: PackageJson,
  dir: string,
): Promise<CheckContext> {
  applyPublishConfig(pkg);
  const { compilerOptions, hasUnresolvedExtends } =
    await resolveCompilerOptionsFromDir(dir);
  const outDir = (compilerOptions?.["outDir"] as string | undefined) ?? "dist";
  const hasBuildOutput = await detectBuildOutput(dir);
  const distFiles = await listDistFiles(dir, outDir);
  const allJsFiles = !pkg.exports ? await listAllJsFiles(dir, pkg.files) : [];

  return {
    pkg,
    dir,
    compilerOptions,
    hasBuildOutput,
    distFiles,
    allJsFiles,
    hasUnresolvedExtends,
  };
}

async function detectBuildOutput(dir: string): Promise<boolean> {
  for (const outDir of ["dist", "lib", "build", "out"]) {
    if (await fileExists(join(dir, outDir))) return true;
  }
  return false;
}

async function listDistFiles(dir: string, outDir: string = "dist"): Promise<string[]> {
  const distDir = join(dir, outDir);
  if (!(await fileExists(distDir))) return [];
  try {
    const files = await readdir(distDir, { recursive: true });
    return files.map((f) => (typeof f === "string" ? f : ""));
  } catch {
    return [];
  }
}

const ALWAYS_SKIP_DIRS = ["node_modules", ".git"];

const NPM_DEFAULT_EXCLUDE_DIRS = new Set([
  "test", "tests", "__tests__", "spec",
  "docs", "doc",
  ".github", ".vscode",
  "example", "examples",
  "benchmark", "benchmarks",
  "coverage", ".nyc_output",
]);

async function parseIgnoreFile(dir: string): Promise<string[]> {
  for (const name of [".npmignore", ".gitignore"]) {
    try {
      const content = await readFile(join(dir, name), "utf-8");
      return content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .map((l) => l.replace(/^\//, "").replace(/\/+$/, ""));
    } catch {
      continue;
    }
  }
  return [];
}

async function listAllJsFiles(
  dir: string,
  filesField?: string[],
): Promise<string[]> {
  try {
    const raw = await readdir(dir, { recursive: true });
    const files = raw.filter(
      (f): f is string => typeof f === "string",
    );

    let ignoredDirs: Set<string> | null = null;
    if (!filesField || filesField.length === 0) {
      const ignorePatterns = await parseIgnoreFile(dir);
      ignoredDirs = new Set(ignorePatterns.filter((p) => !p.includes("*") && !p.includes(".")));
    }

    return files.filter((f) => {
      if (!(f.endsWith(".js") || f.endsWith(".mjs") || f.endsWith(".cjs")))
        return false;
      const segments = f.split("/");
      // Always skip node_modules and .git
      if (segments.some((s) => ALWAYS_SKIP_DIRS.includes(s))) return false;
      // When files field is set, only check files under those directories
      if (filesField && filesField.length > 0) {
        return filesField.some((allowed) => {
          const norm = allowed.replace(/^\.\//, "");
          return f === norm || f.startsWith(norm + "/");
        });
      }
      // Apply npm default excludes (match any segment, like .npmignore)
      if (segments.some((s) => NPM_DEFAULT_EXCLUDE_DIRS.has(s))) return false;
      // Apply ignore file patterns (match any segment)
      if (ignoredDirs) {
        if (segments.some((s) => ignoredDirs!.has(s))) return false;
      }
      return true;
    });
  } catch {
    return [];
  }
}

export function inferEntryPaths(
  pkg: PackageJson,
  distFiles: string[],
): { main: string; types: string } {
  // 1. Use pkg.module / pkg.main if set
  let main = pkg.module || pkg.main;
  if (!main) {
    // 2. Scan distFiles for index.js or index.mjs
    const found = distFiles.find(
      (f) => f === "index.js" || f === "index.mjs",
    );
    main = found ? `./dist/${found}` : "./dist/index.js";
  }

  // 3. Use pkg.types / pkg.typings if set
  let types = pkg.types || (pkg as Record<string, unknown>).typings as string | undefined;
  if (!types) {
    // 4. Scan distFiles for index.d.ts or index.d.mts
    const found = distFiles.find(
      (f) => f === "index.d.ts" || f === "index.d.mts",
    );
    types = found ? `./dist/${found}` : "./dist/index.d.ts";
  }

  return { main, types };
}

async function parseTsconfig(
  filePath: string,
): Promise<{ extends?: string; compilerOptions?: Record<string, unknown> }> {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(stripJsonComments(raw)) as {
    extends?: string;
    compilerOptions?: Record<string, unknown>;
  };
}

async function resolveCompilerOptionsFromDir(dir: string): Promise<{
  compilerOptions: Record<string, unknown> | null;
  hasUnresolvedExtends: boolean;
}> {
  const tsconfigPath = join(dir, "tsconfig.json");
  if (!(await fileExists(tsconfigPath))) {
    return { compilerOptions: null, hasUnresolvedExtends: false };
  }

  try {
    return await resolveCompilerOptions(tsconfigPath);
  } catch {
    return { compilerOptions: null, hasUnresolvedExtends: false };
  }
}

async function resolveCompilerOptions(tsconfigPath: string): Promise<{
  compilerOptions: Record<string, unknown>;
  hasUnresolvedExtends: boolean;
}> {
  let merged: Record<string, unknown> = {};
  let current = tsconfigPath;
  const visited = new Set<string>();
  let hasUnresolvedExtends = false;

  for (let depth = 0; depth < 5; depth++) {
    if (visited.has(current)) break;
    visited.add(current);

    if (!(await fileExists(current))) break;

    let parsed: {
      extends?: string;
      compilerOptions?: Record<string, unknown>;
    };
    try {
      parsed = await parseTsconfig(current);
    } catch {
      break;
    }

    if (parsed.compilerOptions) {
      merged = { ...parsed.compilerOptions, ...merged };
    }

    if (!parsed.extends) break;

    const extendsPath = parsed.extends;
    const baseDir = dirname(current);

    if (extendsPath.startsWith(".")) {
      let resolved = join(baseDir, extendsPath);
      if (!resolved.endsWith(".json")) resolved += ".json";
      current = resolved;
    } else {
      // npm package extends — can't resolve without node_modules
      hasUnresolvedExtends = true;
      break;
    }
  }

  return { compilerOptions: merged, hasUnresolvedExtends };
}
