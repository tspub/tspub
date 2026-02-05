import { join } from "node:path";
import { fileExists } from "../../../shared/resolve.js";
import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const fileExistsRule: Rule = {
  meta: {
    id: "exports/file-exists",
    description: "Check that files referenced in exports exist on disk",
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  async check(ctx) {
    if (!ctx.hasBuildOutput) return [];
    const results: RawDiagnostic[] = [];

    if (ctx.pkg.exports && typeof ctx.pkg.exports !== "string") {
      const exportsObj = ctx.pkg.exports as Record<string, unknown>;
      const keys = Object.keys(exportsObj);
      const isSubpathMap = keys.some((k) => k.startsWith("."));

      if (isSubpathMap) {
        // Check every subpath
        for (const [subpath, val] of Object.entries(exportsObj)) {
          await checkConditionMap(val, `exports["${subpath}"]`, ctx.dir, results);
        }
      } else {
        // Top-level condition map (no subpath keys)
        await checkConditionMap(exportsObj, 'exports["."]', ctx.dir, results);
      }
    }

    // Check main/module/types fields
    if (ctx.pkg.main && !(await fileExists(join(ctx.dir, ctx.pkg.main)))) {
      results.push({
        severity: "warning",
        message: `"main" points to "${ctx.pkg.main}" which doesn't exist (build artifacts missing?)`,
      });
    }
    if (
      ctx.pkg.module &&
      !(await fileExists(join(ctx.dir, ctx.pkg.module)))
    ) {
      results.push({
        severity: "warning",
        message: `"module" points to "${ctx.pkg.module}" which doesn't exist (build artifacts missing?)`,
      });
    }
    if (ctx.pkg.types && !(await fileExists(join(ctx.dir, ctx.pkg.types)))) {
      results.push({
        severity: "warning",
        message: `"types" points to "${ctx.pkg.types}" which doesn't exist (build artifacts missing?)`,
      });
    }

    return results;
  },
};

async function checkConditionMap(
  val: unknown,
  label: string,
  dir: string,
  results: RawDiagnostic[],
): Promise<void> {
  if (typeof val === "string") {
    if (!(await fileExists(join(dir, val)))) {
      results.push({
        severity: "warning",
        message: `${label} points to "${val}" which doesn't exist yet (build first?)`,
      });
    }
    return;
  }

  if (typeof val !== "object" || val === null || Array.isArray(val)) return;

  const obj = val as Record<string, unknown>;
  for (const [key, child] of Object.entries(obj)) {
    if (key === "types" || key === "default" || key === "import" || key === "require" || key === "node" || key === "browser" || key === "module") {
      if (typeof child === "string") {
        if (!(await fileExists(join(dir, child)))) {
          results.push({
            severity: "warning",
            message: `${label}.${key} file not found: ${child}`,
          });
        }
      } else if (typeof child === "object" && child !== null && !Array.isArray(child)) {
        // Nested condition object (e.g., import: { types: ..., default: ... })
        await checkConditionMap(child, `${label}.${key}`, dir, results);
      }
    }
  }
}
