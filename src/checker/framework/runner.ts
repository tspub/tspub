import type { PackageJson } from "../../shared/package-json.js";
import { writePackageJson } from "../../shared/package-json.js";
import type {
  Rule,
  CheckContext,
  RawDiagnostic,
  Diagnostic,
  FixResult,
  Severity,
} from "./types.js";
import { createInterface } from "node:readline/promises";

export interface RunOptions {
  dir: string;
  pkg: PackageJson;
  fix: boolean;
  unsafe?: boolean;
  dryRun?: boolean;
  fixTypes?: string[];
  interactive?: boolean;
  distFiles?: string[];
  severityOverrides?: Record<string, Severity | "off">;
}

export interface RunResult {
  diagnostics: Diagnostic[];
  fixes: FixResult[];
}

async function confirmFix(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await rl.question(`Apply fix: ${message} [y/N] `);
    return answer.trim().toLowerCase() === "y";
  } finally {
    rl.close();
  }
}

export async function runRules(
  rules: Rule[],
  ctx: CheckContext,
  options: RunOptions,
): Promise<RunResult> {
  const diagnostics: Diagnostic[] = [];
  const fixes: FixResult[] = [];
  let pkgModified = false;

  for (const rule of rules) {
    const override = options.severityOverrides?.[rule.meta.id];
    if (override === "off") continue;

    let rawDiags: RawDiagnostic[];
    try {
      rawDiags = await rule.check(ctx);
    } catch (err) {
      diagnostics.push({
        ruleId: rule.meta.id,
        severity: "error",
        message: `Rule "${rule.meta.id}" threw: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    for (const raw of rawDiags) {
      const severity = override ?? raw.severity;
      diagnostics.push({
        ruleId: rule.meta.id,
        severity,
        message: raw.message,
        ...(raw.data ? { data: raw.data } : {}),
      });
    }

    const canFix =
      options.fix &&
      rule.fix &&
      rawDiags.length > 0 &&
      (rule.meta.fixable === "safe" ||
        (rule.meta.fixable === "unsafe" && options.unsafe === true)) &&
      (!options.fixTypes ||
        options.fixTypes.includes(rule.meta.category));

    if (canFix) {
      if (options.dryRun) {
        // Run fix on a cloned pkg to preview without mutating
        const clonedPkg = structuredClone(options.pkg) as PackageJson;
        try {
          const fixResult = await rule.fix!({
            pkg: clonedPkg,
            dir: options.dir,
            distFiles: options.distFiles ?? [],
          });
          if (fixResult.message) {
            fixes.push(fixResult);
          }
        } catch (err) {
          diagnostics.push({
            ruleId: rule.meta.id,
            severity: "error",
            message: `Rule "${rule.meta.id}" fix threw: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      } else if (options.interactive) {
        // Preview fix on clone, then apply clone's changes if confirmed
        const clonedPkg = structuredClone(options.pkg) as PackageJson;
        try {
          const preview = await rule.fix!({
            pkg: clonedPkg,
            dir: options.dir,
            distFiles: options.distFiles ?? [],
          });
          if (preview.message) {
            const confirmed = await confirmFix(preview.message);
            if (confirmed) {
              fixes.push(preview);
              if (preview.pkgModified) {
                // Replace all keys: delete keys absent from clone, copy all clone keys
                for (const key of Object.keys(options.pkg)) {
                  if (!(key in clonedPkg)) {
                    delete (options.pkg as Record<string, unknown>)[key];
                  }
                }
                Object.assign(options.pkg, clonedPkg);
                pkgModified = true;
              }
            }
          }
        } catch (err) {
          diagnostics.push({
            ruleId: rule.meta.id,
            severity: "error",
            message: `Rule "${rule.meta.id}" fix threw: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      } else {
        try {
          const fixResult = await rule.fix!({
            pkg: options.pkg,
            dir: options.dir,
            distFiles: options.distFiles ?? [],
          });
          if (fixResult.message) {
            fixes.push(fixResult);
            if (fixResult.pkgModified) pkgModified = true;
          }
        } catch (err) {
          diagnostics.push({
            ruleId: rule.meta.id,
            severity: "error",
            message: `Rule "${rule.meta.id}" fix threw: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }
  }

  if (pkgModified) {
    await writePackageJson(options.dir, options.pkg);
  }

  return { diagnostics, fixes };
}
