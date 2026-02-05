import { join } from "node:path";
import { fileExists } from "../../../shared/resolve.js";
import type { Rule, RawDiagnostic } from "../../framework/types.js";

interface ExportEntry {
  subpath: string;
  jsFile: string;
}

function walkExports(
  exports: Record<string, unknown>,
): ExportEntry[] {
  const entries: ExportEntry[] = [];
  const keys = Object.keys(exports);
  const isSubpathMap = keys.some((k) => k.startsWith("."));

  if (isSubpathMap) {
    for (const [subpath, val] of Object.entries(exports)) {
      collectJsFiles(val, subpath, entries);
    }
  } else {
    // Sugar form — condition map at top level
    collectJsFiles(exports, ".", entries);
  }

  return entries;
}

function collectJsFiles(
  val: unknown,
  subpath: string,
  entries: ExportEntry[],
): void {
  if (typeof val === "string") {
    if (isJsFile(val)) entries.push({ subpath, jsFile: val });
    return;
  }
  if (typeof val !== "object" || val === null || Array.isArray(val)) return;

  const obj = val as Record<string, unknown>;
  for (const [key, child] of Object.entries(obj)) {
    if (key === "types") continue; // skip types conditions
    if (typeof child === "string" && isJsFile(child)) {
      entries.push({ subpath, jsFile: child });
    } else if (typeof child === "object" && child !== null) {
      collectJsFiles(child, subpath, entries);
    }
  }
}

function isJsFile(path: string): boolean {
  return /\.(js|mjs|cjs)$/.test(path);
}

function deriveDtsPath(jsPath: string): string[] {
  const paths: string[] = [];
  if (jsPath.endsWith(".mjs")) {
    paths.push(jsPath.replace(/\.mjs$/, ".d.mts"));
    paths.push(jsPath.replace(/\.mjs$/, ".d.ts"));
  } else if (jsPath.endsWith(".cjs")) {
    paths.push(jsPath.replace(/\.cjs$/, ".d.cts"));
    paths.push(jsPath.replace(/\.cjs$/, ".d.ts"));
  } else {
    paths.push(jsPath.replace(/\.js$/, ".d.ts"));
    paths.push(jsPath.replace(/\.js$/, ".d.mts"));
  }
  return paths;
}

export const declarationCompletenessRule: Rule = {
  meta: {
    id: "types/declaration-completeness",
    description: "Check that all export subpaths have corresponding .d.ts files",
    defaultSeverity: "warning",
    fixable: false,
    category: "types",
  },
  async check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    if (!ctx.pkg.exports || typeof ctx.pkg.exports === "string") return [];

    const results: RawDiagnostic[] = [];
    const exports = ctx.pkg.exports as Record<string, unknown>;
    const jsEntries = walkExports(exports);

    // Deduplicate by jsFile
    const seen = new Set<string>();
    for (const entry of jsEntries) {
      if (seen.has(entry.jsFile)) continue;
      seen.add(entry.jsFile);

      const dtsPaths = deriveDtsPath(entry.jsFile);
      let found = false;
      for (const dts of dtsPaths) {
        if (await fileExists(join(ctx.dir, dts))) {
          found = true;
          break;
        }
      }

      if (!found) {
        results.push({
          severity: "warning",
          message: `exports["${entry.subpath}"]: no .d.ts file found for "${entry.jsFile}" (expected ${dtsPaths[0]})`,
        });
      }
    }

    return results;
  },
};
