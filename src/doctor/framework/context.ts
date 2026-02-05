import { join } from "node:path";
import { readFile, readdir } from "node:fs/promises";
import type { PackageJson } from "../../shared/package-json.js";
import { fileExists } from "../../shared/resolve.js";
import { stripJsonComments } from "../../shared/strip-json-comments.js";
import type { DoctorContext } from "./types.js";
import { dirname } from "node:path";

const LOCK_FILE_NAMES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
];

export async function buildDoctorContext(
  pkg: PackageJson,
  dir: string,
): Promise<DoctorContext> {
  const compilerOptions = await resolveCompilerOptionsFromDir(dir);
  const hasBuildOutput = await detectBuildOutput(dir);
  const distFiles = await listDistFiles(dir, compilerOptions);
  const lockFiles = await findLockFiles(dir);

  return {
    pkg,
    dir,
    compilerOptions,
    hasBuildOutput,
    distFiles,
    lockFiles,
  };
}

async function detectBuildOutput(dir: string): Promise<boolean> {
  for (const outDir of ["dist", "lib", "build", "out"]) {
    if (await fileExists(join(dir, outDir))) return true;
  }
  return false;
}

async function listDistFiles(
  dir: string,
  compilerOptions: Record<string, unknown> | null,
): Promise<string[]> {
  const outDir = (compilerOptions?.["outDir"] as string | undefined) ?? "dist";
  const distDir = join(dir, outDir);
  if (!(await fileExists(distDir))) return [];
  try {
    const files = await readdir(distDir, { recursive: true });
    return files.filter((f): f is string => typeof f === "string");
  } catch {
    return [];
  }
}

async function findLockFiles(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const f of LOCK_FILE_NAMES) {
    if (await fileExists(join(dir, f))) {
      found.push(f);
    }
  }
  return found;
}

async function resolveCompilerOptionsFromDir(
  dir: string,
): Promise<Record<string, unknown> | null> {
  const tsconfigPath = join(dir, "tsconfig.json");
  if (!(await fileExists(tsconfigPath))) return null;

  try {
    return await resolveCompilerOptions(tsconfigPath);
  } catch {
    return null;
  }
}

async function resolveCompilerOptions(
  tsconfigPath: string,
): Promise<Record<string, unknown>> {
  let merged: Record<string, unknown> = {};
  let current = tsconfigPath;
  const visited = new Set<string>();

  for (let depth = 0; depth < 5; depth++) {
    if (visited.has(current)) break;
    visited.add(current);
    if (!(await fileExists(current))) break;

    let parsed: { extends?: string; compilerOptions?: Record<string, unknown> };
    try {
      const raw = await readFile(current, "utf-8");
      parsed = JSON.parse(stripJsonComments(raw));
    } catch {
      break;
    }

    if (parsed.compilerOptions) {
      merged = { ...parsed.compilerOptions, ...merged };
    }

    if (!parsed.extends) break;

    const baseDir = dirname(current);
    if (parsed.extends.startsWith(".")) {
      let resolved = join(baseDir, parsed.extends);
      if (!resolved.endsWith(".json")) resolved += ".json";
      current = resolved;
    } else {
      break;
    }
  }

  return merged;
}
