import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface PackageJson {
  name?: string;
  version?: string;
  type?: string;
  exports?: Record<string, unknown> | string;
  main?: string;
  module?: string;
  types?: string;
  files?: string[];
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  bin?: string | Record<string, string>;
  sideEffects?: boolean;
  license?: string;
  publishConfig?: Record<string, unknown>;
  typings?: string;
  repository?: string | { type: string; url: string };
  [key: string]: unknown;
}

export async function readPackageJson(dir: string): Promise<PackageJson> {
  const filePath = join(dir, "package.json");
  let content: string;
  try {
    content = await readFile(filePath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    throw new Error(`Cannot read ${filePath}${code ? ` (${code})` : ""}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in ${filePath}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${filePath} must be a JSON object`);
  }
  return parsed as PackageJson;
}

export async function writePackageJson(
  dir: string,
  pkg: PackageJson,
): Promise<void> {
  const filePath = join(dir, "package.json");
  // Detect existing indentation to preserve formatting
  let indent: string | number = 2;
  try {
    const existing = await readFile(filePath, "utf-8");
    const match = existing.match(/^{\n(\t+| {2,})/);
    if (match) {
      indent = match[1]!.startsWith("\t") ? "\t" : match[1]!.length;
    }
  } catch {
    // New file — use default
  }
  await writeFile(filePath, JSON.stringify(pkg, null, indent) + "\n");
}
