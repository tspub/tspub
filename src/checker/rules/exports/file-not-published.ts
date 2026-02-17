import { join } from "node:path";
import { readFile } from "node:fs/promises";
import fg from "fast-glob";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { walkExports } from "../utils/exports-traversal.js";
import { fileExists } from "../../../shared/resolve.js";

const ALWAYS_INCLUDED = [
  "package.json",
  "README",
  "LICENSE",
  "LICENCE",
  "CHANGELOG",
];

function isAlwaysIncluded(filePath: string): boolean {
  const base = filePath.replace(/^\.\//, "").split("/")[0]!;
  return ALWAYS_INCLUDED.some(
    (prefix) =>
      base === prefix || base.toUpperCase().startsWith(prefix.toUpperCase()),
  );
}

function matchesFilesField(filePath: string, filesPatterns: string[]): boolean {
  const normalized = filePath.replace(/^\.\//, "");
  return filesPatterns.some((pattern) => {
    // Strip leading ./ and / (npm treats "/dist" the same as "dist")
    // Then strip glob suffixes to extract the directory prefix
    const p = pattern
      .replace(/^\.?\//, "")
      .replace(/\/\*\*\/.*$/, "")           // dist/**/!(*.tsbuildinfo) → dist
      .replace(/\/\*\*$/, "")               // dist/** → dist
      .replace(/\/\*\.[^/]+$/, "")          // dist/*.js → dist
      .replace(/\/\*$/, "");                // dist/* → dist
    return normalized === p || normalized.startsWith(p + "/");
  });
}

function collectReferencedFiles(pkg: Record<string, unknown>): string[] {
  const files: string[] = [];

  if (pkg.exports) {
    const entries = walkExports(pkg.exports as Record<string, unknown>);
    for (const entry of entries) {
      if (!entry.value.includes("*")) {
        files.push(entry.value);
      }
    }
  }

  if (typeof pkg.main === "string") files.push(pkg.main);
  if (typeof pkg.module === "string") files.push(pkg.module);
  if (typeof pkg.types === "string") files.push(pkg.types);

  if (typeof pkg.bin === "string") {
    files.push(pkg.bin);
  } else if (typeof pkg.bin === "object" && pkg.bin !== null) {
    for (const val of Object.values(pkg.bin as Record<string, string>)) {
      if (typeof val === "string") files.push(val);
    }
  }

  return [...new Set(files)];
}

export const fileNotPublishedRule: Rule = {
  meta: {
    id: "exports/file-not-published",
    description:
      "Check that files referenced in exports/main/bin are included in the published package",
    defaultSeverity: "error",
    fixable: false,
    category: "exports",
  },
  async check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    const results: RawDiagnostic[] = [];

    const referencedFiles = collectReferencedFiles(ctx.pkg as Record<string, unknown>);
    if (referencedFiles.length === 0) return [];

    const filesField = ctx.pkg.files as string[] | undefined;

    // Read .npmignore if it exists
    let npmignorePatterns: string[] = [];
    try {
      const content = await readFile(join(ctx.dir, ".npmignore"), "utf-8");
      npmignorePatterns = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"));
    } catch {
      // no .npmignore
    }

    for (const file of referencedFiles) {
      if (isAlwaysIncluded(file)) continue;

      // Skip files that don't exist on disk — they're likely build artifacts
      // not yet built. The file-exists rule handles that case separately.
      const fullPath = join(ctx.dir, file);
      if (!(await fileExists(fullPath))) continue;

      if (filesField) {
        if (!matchesFilesField(file, filesField)) {
          results.push({
            severity: "error",
            message: `"${file}" is referenced in package.json but not included by "files" field — it won't be published`,
          });
          continue;
        }
      }

      if (npmignorePatterns.length > 0) {
        const normalized = file.replace(/^\.\//, "");
        const matched = await fg(npmignorePatterns, {
          cwd: ctx.dir,
        });
        if (matched.includes(normalized)) {
          results.push({
            severity: "error",
            message: `"${file}" is referenced in package.json but matched by .npmignore — it won't be published`,
          });
        }
      }
    }

    return results;
  },
};
