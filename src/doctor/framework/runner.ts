import type { PackageJson } from "../../shared/package-json.js";
import { writePackageJson } from "../../shared/package-json.js";
import type {
  DoctorRule,
  DoctorContext,
  DoctorRawDiagnostic,
  DoctorDiagnostic,
  DoctorFixResult,
  DoctorSeverity,
} from "./types.js";
import { createInterface } from "node:readline/promises";

export interface DoctorRunOptions {
  dir: string;
  pkg: PackageJson;
  fix: boolean;
  unsafe?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
  severityOverrides?: Record<string, DoctorSeverity | "off">;
}

export interface DoctorRunResult {
  diagnostics: DoctorDiagnostic[];
  fixes: DoctorFixResult[];
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

export async function runDoctorRules(
  rules: DoctorRule[],
  ctx: DoctorContext,
  options: DoctorRunOptions,
): Promise<DoctorRunResult> {
  const diagnostics: DoctorDiagnostic[] = [];
  const fixes: DoctorFixResult[] = [];
  let pkgModified = false;

  for (const rule of rules) {
    const override = options.severityOverrides?.[rule.meta.id];
    if (override === "off") continue;

    let rawDiags: DoctorRawDiagnostic[];
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
        (rule.meta.fixable === "unsafe" && options.unsafe === true));

    if (canFix) {
      if (options.dryRun) {
        const clonedPkg = structuredClone(options.pkg) as PackageJson;
        try {
          const fixResult = await rule.fix!({
            pkg: clonedPkg,
            dir: options.dir,
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
        const clonedPkg = structuredClone(options.pkg) as PackageJson;
        try {
          const preview = await rule.fix!({
            pkg: clonedPkg,
            dir: options.dir,
          });
          if (preview.message) {
            const confirmed = await confirmFix(preview.message);
            if (confirmed) {
              fixes.push(preview);
              if (preview.pkgModified) {
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
