import { readPackageJson } from "../shared/package-json.js";
import { buildContext } from "./framework/context.js";
import { runRules } from "./framework/runner.js";
import { allRules } from "./rules/index.js";
import { loadConfig } from "../config/loader.js";
import { loadPlugins } from "./plugins.js";
import type { Severity, Rule } from "./framework/types.js";

export type CheckSeverity = "error" | "warning" | "info" | "ok";

export interface CheckResult {
  severity: CheckSeverity;
  message: string;
  fixable?: false | "safe" | "unsafe";
  ruleId?: string;
  data?: Record<string, unknown>;
}

export interface CheckOptions {
  dir: string;
  fix: boolean;
  strict: boolean;
  unsafe?: boolean;
  dryRun?: boolean;
  fixTypes?: string[];
  interactive?: boolean;
  severityOverrides?: Record<string, Severity | "off">;
  /** Pre-loaded config to avoid redundant file I/O. If omitted, config is loaded from dir. */
  _config?: Awaited<ReturnType<typeof loadConfig>>;
}

const OK_MESSAGES: Record<string, string> = {
  exports: "exports field is correct and complete",
  types: "type declarations exist and are referenced correctly",
  files: "no sensitive files found in published package",
  metadata: "license file exists",
  size: "package size: healthy",
};

export async function check(options: CheckOptions): Promise<CheckResult[]> {
  const { dir, fix, unsafe, dryRun, fixTypes, interactive } = options;
  const pkg = await readPackageJson(dir);
  const ctx = await buildContext(pkg, dir);

  // Merge severity overrides: config < CLI (CLI wins)
  const config = options._config !== undefined ? options._config : await loadConfig(dir);
  const severityOverrides: Record<string, Severity | "off"> = {
    ...config?.check?.severityOverrides,
    ...options.severityOverrides,
  };

  // Load plugins if configured
  let rules: Rule[] = [...allRules];
  if (config?.check?.plugins && config.check.plugins.length > 0) {
    const pluginRules = await loadPlugins(config.check.plugins, dir);
    rules = [...rules, ...pluginRules];
  }

  const { diagnostics, fixes } = await runRules(rules, ctx, {
    dir,
    pkg,
    fix,
    unsafe,
    dryRun,
    fixTypes,
    interactive,
    distFiles: ctx.distFiles,
    severityOverrides,
  });

  const results: CheckResult[] = diagnostics.map((d) => ({
    severity: d.severity,
    message: d.message,
    fixable: rules.find((r) => r.meta.id === d.ruleId)?.meta.fixable,
    ruleId: d.ruleId,
    ...(d.data ? { data: d.data } : {}),
  }));

  // Synthesize "ok" messages per category (preserves current output)
  for (const cat of ["exports", "types", "files", "metadata", "size"]) {
    const catRules = rules.filter((r) => r.meta.id.startsWith(cat + "/"));
    const allOff = catRules.length > 0 && catRules.every((r) => severityOverrides[r.meta.id] === "off");
    if (allOff) continue;

    const catDiags = diagnostics.filter((d) =>
      d.ruleId.startsWith(cat + "/"),
    );
    if (!catDiags.some((d) => d.severity === "error" || d.severity === "warning")) {
      results.push({
        severity: "ok",
        message: OK_MESSAGES[cat] ?? `${cat} checks passed`,
      });
    }
  }

  const fixPrefix = dryRun ? "Would fix" : "Fixed";
  for (const f of fixes) {
    if (f.message) {
      results.push({ severity: "info", message: `${fixPrefix}: ${f.message}` });
    }
  }

  // Show skipped unsafe fixes when --fix is used without --unsafe
  if (fix && !unsafe) {
    const seen = new Set<string>();
    for (const d of diagnostics) {
      if (seen.has(d.ruleId)) continue;
      seen.add(d.ruleId);
      const rule = rules.find((r) => r.meta.id === d.ruleId);
      if (rule?.meta.fixable === "unsafe" && rule.fix) {
        results.push({
          severity: "info",
          message: `Skippable fix (use --unsafe): ${rule.meta.description}`,
          ruleId: d.ruleId,
        });
      }
    }
  }

  return results;
}
