import { join } from "node:path";
import { fileExists } from "../../../shared/resolve.js";
import type { Rule, RawDiagnostic } from "../../framework/types.js";

const JS_CONDITIONS = new Set(["import", "require", "default", "node", "browser", "module"]);

interface ConditionInfo {
  subpath: string;
  condition: string;
  typesFile: string | null;
  jsFile: string | null;
}

function walkExportsForResolution(
  exports: Record<string, unknown>,
): ConditionInfo[] {
  const results: ConditionInfo[] = [];
  const keys = Object.keys(exports);
  const isSubpathMap = keys.some((k) => k.startsWith("."));

  if (isSubpathMap) {
    for (const [subpath, val] of Object.entries(exports)) {
      walkConditionMap(val, subpath, results);
    }
  } else {
    walkConditionMap(exports, ".", results);
  }

  return results;
}

function walkConditionMap(
  val: unknown,
  subpath: string,
  results: ConditionInfo[],
): void {
  if (typeof val !== "object" || val === null || Array.isArray(val)) return;

  const obj = val as Record<string, unknown>;
  let typesFile: string | null = null;
  let jsFile: string | null = null;
  let condition = "";

  if (typeof obj["types"] === "string") {
    typesFile = obj["types"] as string;
  }

  for (const [key, child] of Object.entries(obj)) {
    if (JS_CONDITIONS.has(key)) {
      if (typeof child === "string") {
        condition = key;
        jsFile = child;

        // If this condition has its own nested types, extract
        results.push({ subpath, condition, typesFile, jsFile });
      } else if (typeof child === "object" && child !== null) {
        // Nested condition object (e.g. import: { types: ..., default: ... })
        const nested = child as Record<string, unknown>;
        const nestedTypes = typeof nested["types"] === "string" ? nested["types"] as string : null;
        const nestedDefault = typeof nested["default"] === "string" ? nested["default"] as string : null;
        if (nestedDefault || nestedTypes) {
          results.push({
            subpath,
            condition: key,
            typesFile: nestedTypes ?? typesFile,
            jsFile: nestedDefault,
          });
        }
      }
    }
  }
}

export const resolutionRule: Rule = {
  meta: {
    id: "types/resolution",
    description: "Validate type resolution across module formats (attw-lite)",
    defaultSeverity: "error",
    fixable: false,
    category: "types",
  },
  async check(ctx) {
    if (!ctx.pkg.exports || typeof ctx.pkg.exports === "string") return [];

    const results: RawDiagnostic[] = [];
    const exports = ctx.pkg.exports as Record<string, unknown>;
    const conditions = walkExportsForResolution(exports);
    const pkgType = ctx.pkg.type ?? "commonjs";

    for (const info of conditions) {
      const { subpath, condition, typesFile, jsFile } = info;
      const label = `exports["${subpath}"].${condition}`;

      // Check 1: Missing types condition
      if (jsFile && !typesFile) {
        results.push({
          severity: "error",
          message: `${label}: has JS entry but no "types" condition — TypeScript cannot resolve types`,
        });
        continue;
      }

      // Check 2: Types file existence
      if (typesFile && ctx.hasBuildOutput) {
        if (!(await fileExists(join(ctx.dir, typesFile)))) {
          results.push({
            severity: "error",
            message: `${label}: types file "${typesFile}" does not exist`,
          });
        }
      }

      // Check 3: Format mismatch detection
      if (typesFile && jsFile) {
        const isDts = typesFile.endsWith(".d.ts");
        const isDmts = typesFile.endsWith(".d.mts");
        const isDcts = typesFile.endsWith(".d.cts");

        if (isDts && !isDmts && !isDcts) {
          // .d.ts format depends on package type field
          if (condition === "require" && pkgType === "module") {
            results.push({
              severity: "error",
              message: `${label}: types file "${typesFile}" is .d.ts but under "require" with "type":"module" — should be .d.cts to avoid masquerading as ESM`,
            });
          } else if (condition === "import" && pkgType !== "module") {
            results.push({
              severity: "error",
              message: `${label}: types file "${typesFile}" is .d.ts but under "import" without "type":"module" — should be .d.mts to avoid masquerading as CJS`,
            });
          }
        }
      }
    }

    // Multi-resolution testing with TypeScript compiler API
    // Only runs when the package can be resolved from node_modules (not self-check)
    if (ctx.hasBuildOutput && ctx.pkg.name) {
      try {
        const { access } = await import("node:fs/promises");
        const nmPath = join(ctx.dir, "node_modules", ctx.pkg.name);
        await access(nmPath);
        const ts = await import("typescript");
        const resolutionModes = [
          { name: "node10", options: { moduleResolution: ts.default.ModuleResolutionKind.Node10, module: ts.default.ModuleKind.CommonJS } },
          { name: "node16-cjs", options: { moduleResolution: ts.default.ModuleResolutionKind.Node16, module: ts.default.ModuleKind.CommonJS } },
          { name: "node16-esm", options: { moduleResolution: ts.default.ModuleResolutionKind.Node16, module: ts.default.ModuleKind.ESNext } },
          { name: "bundler", options: { moduleResolution: ts.default.ModuleResolutionKind.Bundler, module: ts.default.ModuleKind.ESNext } },
        ];

        const exportsObj = exports as Record<string, unknown>;
        const subpaths = Object.keys(exportsObj).filter((k) => k.startsWith("."));
        if (subpaths.length === 0) subpaths.push(".");

        for (const subpath of subpaths) {
          const importPath = subpath === "."
            ? ctx.pkg.name
            : `${ctx.pkg.name}/${subpath.slice(2)}`;

          for (const mode of resolutionModes) {
            const compilerOptions: Record<string, unknown> = {
              ...mode.options,
              baseUrl: ctx.dir,
              paths: {},
            };
            const host = ts.default.createCompilerHost(compilerOptions as import("typescript").CompilerOptions);
            const resolved = ts.default.resolveModuleName(
              importPath,
              join(ctx.dir, "__tspub_check__.ts"),
              compilerOptions as import("typescript").CompilerOptions,
              host,
            );

            if (!resolved.resolvedModule) {
              results.push({
                severity: "warning",
                message: `exports["${subpath}"] fails to resolve under ${mode.name}`,
                data: { entrypoint: subpath, mode: mode.name, resolved: false },
              });
            }
          }
        }
      } catch {
        // TypeScript not available — skip multi-resolution check
      }
    }

    return results;
  },
};
