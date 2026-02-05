import { readPackageJson } from "../shared/package-json.js";
import { buildDoctorContext } from "./framework/context.js";
import { runDoctorRules } from "./framework/runner.js";
import { allDoctorRules } from "./rules/index.js";
import { loadDoctorPlugins } from "./plugins.js";
import { loadConfig } from "../config/loader.js";
import { DOCTOR_PROFILES } from "./profiles.js";
import type { DoctorSeverity, DoctorRule } from "./framework/types.js";

export type { DoctorSeverity } from "./framework/types.js";
export type { DoctorRule, DoctorRuleMeta, DoctorContext } from "./framework/types.js";

export interface DoctorResult {
  severity: DoctorSeverity;
  message: string;
  category: string;
  ruleId?: string;
  fixable?: false | "safe" | "unsafe";
}

export interface DoctorOptions {
  dir: string;
  fix?: boolean;
  unsafe?: boolean;
  dryRun?: boolean;
  interactive?: boolean;
  severityOverrides?: Record<string, DoctorSeverity | "off">;
  profile?: string;
  format?: "text" | "json";
}

export async function doctor(
  dirOrOptions: string | DoctorOptions,
): Promise<DoctorResult[]> {
  const options: DoctorOptions =
    typeof dirOrOptions === "string"
      ? { dir: dirOrOptions }
      : dirOrOptions;

  const {
    dir,
    fix = false,
    unsafe,
    dryRun,
    interactive,
    profile,
  } = options;

  const pkg = await readPackageJson(dir);
  const ctx = await buildDoctorContext(pkg, dir);

  // Merge severity overrides: config < CLI
  const config = await loadConfig(dir);
  const severityOverrides: Record<string, DoctorSeverity | "off"> = {
    ...config?.doctor?.severityOverrides,
    ...options.severityOverrides,
  };

  // Apply profile skip list
  if (profile && profile in DOCTOR_PROFILES) {
    const skipList = DOCTOR_PROFILES[profile]!;
    for (const ruleId of skipList) {
      if (!(ruleId in severityOverrides)) {
        severityOverrides[ruleId] = "off";
      }
    }
  }

  // Load rules + plugins
  let rules: DoctorRule[] = [...allDoctorRules];
  const pluginSpecs = config?.doctor?.plugins;
  if (pluginSpecs && pluginSpecs.length > 0) {
    const pluginRules = await loadDoctorPlugins(pluginSpecs, dir);
    rules = [...rules, ...pluginRules];
  }

  const { diagnostics, fixes } = await runDoctorRules(rules, ctx, {
    dir,
    pkg,
    fix,
    unsafe,
    dryRun,
    interactive,
    severityOverrides,
  });

  const results: DoctorResult[] = diagnostics.map((d) => ({
    severity: d.severity,
    message: d.message,
    category: d.ruleId.split("/")[0] ?? "other",
    ruleId: d.ruleId,
    fixable: rules.find((r) => r.meta.id === d.ruleId)?.meta.fixable,
  }));

  const fixPrefix = dryRun ? "Would fix" : "Fixed";
  for (const f of fixes) {
    if (f.message) {
      results.push({
        severity: "info",
        message: `${fixPrefix}: ${f.message}`,
        category: "fix",
      });
    }
  }

  return results;
}
