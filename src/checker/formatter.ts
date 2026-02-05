import chalk from "chalk";
import { allRules } from "./rules/index.js";
import { logger } from "../shared/logger.js";
import { CATEGORY_ORDER, RULE_MAPPING } from "./profiles.js";
import type { CheckResult } from "./index.js";

export function groupResultsByCategory(results: CheckResult[]): Map<string, CheckResult[]> {
  const grouped = new Map<string, CheckResult[]>();
  for (const cat of CATEGORY_ORDER) {
    grouped.set(cat, []);
  }

  for (const r of results) {
    if (!r.ruleId) {
      // Fix messages or non-rule results — put in the appropriate category
      if (r.severity === "info" || r.severity === "ok") {
        // Try to guess category from message
        let placed = false;
        for (const cat of CATEGORY_ORDER) {
          if (r.message.toLowerCase().includes(cat)) {
            grouped.get(cat)?.push(r);
            placed = true;
            break;
          }
        }
        if (!placed) {
          if (!grouped.has("other")) grouped.set("other", []);
          grouped.get("other")?.push(r);
        }
      }
      continue;
    }
    const cat = r.ruleId.split("/")[0] ?? "other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)?.push(r);
  }

  return grouped;
}

export function printGroupedResults(results: CheckResult[], strict: boolean, compare = false): { errors: number; warnings: number; passed: number } {
  const grouped = groupResultsByCategory(results);
  let errors = 0;
  let warnings = 0;
  let passed = 0;

  for (const [category, catResults] of grouped) {
    if (catResults.length === 0) continue;

    console.log();
    console.log(chalk.bold.cyan(`── ${category} ──`));

    for (const result of catResults) {
      let compareTag = "";
      if (compare && result.ruleId) {
        const mapping = RULE_MAPPING[result.ruleId];
        if (mapping) {
          const parts: string[] = [];
          if (mapping.publint) parts.push(`publint:${mapping.publint}`);
          if (mapping.attw) parts.push(`attw:${mapping.attw}`);
          if (parts.length > 0) compareTag = chalk.dim(` [${parts.join(" / ")}]`);
        }
      }
      if (result.severity === "error") {
        logger.error(result.message + compareTag);
        errors++;
      } else if (result.severity === "warning") {
        logger.warn(result.message + compareTag);
        if (strict) {
          errors++;
        } else {
          warnings++;
        }
      } else if (result.severity === "info") {
        logger.info(result.message + compareTag);
      } else if (result.severity === "ok") {
        logger.ok(result.message + compareTag);
        passed++;
      }
    }
  }

  return { errors, warnings, passed };
}

export function printResolutionTable(results: CheckResult[]): void {
  // Filter resolution-related results
  const resolutionResults = results.filter(
    (r) => r.ruleId === "types/resolution",
  );
  if (resolutionResults.length === 0) return;

  console.log();
  console.log(chalk.bold("Type Resolution:"));
  console.log();

  // Parse resolution results into a table structure
  const entrypoints = new Map<string, Map<string, "pass" | "fail">>();
  const modeSet = new Set<string>();

  for (const r of resolutionResults) {
    // Prefer structured data if available, fall back to regex
    const entrypoint = r.data?.entrypoint as string | undefined;
    const mode = r.data?.mode as string | undefined;

    if (entrypoint && mode) {
      const mLower = mode.toLowerCase();
      modeSet.add(mLower);
      if (!entrypoints.has(entrypoint)) {
        entrypoints.set(entrypoint, new Map());
      }
      entrypoints.get(entrypoint)!.set(mLower, r.severity === "error" ? "fail" : "pass");
    } else {
      // Fallback: regex parse from message
      const match = r.message.match(/["']([^"']+)["'].*\b(node10|node16(?:-(?:cjs|esm))?|bundler)\b/i);
      if (match) {
        const [, ep, m] = match;
        const mLower = m!.toLowerCase();
        modeSet.add(mLower);
        if (!entrypoints.has(ep!)) {
          entrypoints.set(ep!, new Map());
        }
        entrypoints.get(ep!)!.set(mLower, r.severity === "error" ? "fail" : "pass");
      }
    }
  }

  // Derive mode columns from actual data, with a stable fallback order
  const KNOWN_ORDER = ["node10", "node16-cjs", "node16-esm", "bundler"];
  const modes = KNOWN_ORDER.filter((m) => modeSet.has(m));
  // Append any unknown modes
  for (const m of modeSet) {
    if (!modes.includes(m)) modes.push(m);
  }

  const header = "  " + "Entrypoint".padEnd(30) + modes.map((m) => m.padEnd(14)).join("");
  console.log(chalk.dim(header));
  console.log(chalk.dim("  " + "─".repeat(30 + modes.length * 14)));

  if (entrypoints.size > 0) {
    for (const [ep, modeResults] of entrypoints) {
      const cells = modes.map((m) => {
        const status = modeResults.get(m);
        if (!status) return chalk.dim("─");
        return status === "pass" ? chalk.green("✓") : chalk.red("✗");
      });
      // Pad each cell to 14 visible characters; chalk adds ANSI escapes so measure visible length
      console.log("  " + ep.padEnd(30) + cells.map((c) => c + " ".repeat(Math.max(0, 14 - stripAnsi(c).length))).join(""));
    }
  } else {
    // If we can't parse into table, just show them as-is
    for (const r of resolutionResults) {
      if (r.severity === "error") {
        console.log("  " + chalk.red("✗") + " " + r.message);
      } else {
        console.log("  " + chalk.green("✓") + " " + r.message);
      }
    }
  }
  console.log();
}

export function printListRules(): void {
  if (allRules.length === 0) {
    console.log("\nNo rules registered.\n");
    return;
  }
  const maxId = Math.max(...allRules.map((r) => r.meta.id.length));
  const maxDesc = Math.max(...allRules.map((r) => r.meta.description.length));

  console.log();
  console.log(chalk.bold("Available rules:"));
  console.log();
  console.log(
    chalk.dim(
      "  " +
        "ID".padEnd(maxId + 2) +
        "Severity".padEnd(10) +
        "Fixable".padEnd(10) +
        "Description",
    ),
  );
  console.log(chalk.dim("  " + "─".repeat(maxId + maxDesc + 24)));

  let currentCategory = "";
  for (const rule of allRules) {
    const cat = rule.meta.category;
    if (cat !== currentCategory) {
      currentCategory = cat;
      console.log();
      console.log(chalk.bold.cyan(`  ── ${cat} ──`));
    }

    const fixLabel =
      rule.meta.fixable === false
        ? chalk.dim("no")
        : rule.meta.fixable === "safe"
          ? chalk.green("safe")
          : chalk.yellow("unsafe");

    const sevLabel =
      rule.meta.defaultSeverity === "error"
        ? chalk.red(rule.meta.defaultSeverity)
        : rule.meta.defaultSeverity === "warning"
          ? chalk.yellow(rule.meta.defaultSeverity)
          : chalk.blue(rule.meta.defaultSeverity);

    console.log(
      "  " +
        chalk.white(rule.meta.id.padEnd(maxId + 2)) +
        (sevLabel + " ".repeat(Math.max(0, 10 - stripAnsi(sevLabel).length))) +
        (fixLabel + " ".repeat(Math.max(0, 10 - stripAnsi(fixLabel).length))) +
        chalk.dim(rule.meta.description),
    );
  }
  console.log();
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1B\[[0-9;]*m/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}
