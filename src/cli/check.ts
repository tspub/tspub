import type { Command } from "commander";
import { check } from "../checker/index.js";
import { allRules } from "../checker/rules/index.js";
import { logger } from "../shared/logger.js";
import type { Severity } from "../checker/framework/types.js";
import type { CheckResult } from "../checker/index.js";
import { isMonorepoRoot, discoverWorkspaces, topoSort, filterPackages } from "../workspace/index.js";
import { loadConfigWithInheritance } from "../config/loader.js";
import chalk from "chalk";
import { PROFILES, ALLOW_LIST_PROFILES, parseSeverityOverrides } from "../checker/profiles.js";
import { printGroupedResults, printResolutionTable, printListRules } from "../checker/formatter.js";

interface CheckActionOptions {
  fix?: boolean;
  fixDryRun?: boolean;
  fixType?: string;
  interactive?: boolean;
  unsafe?: boolean;
  strict?: boolean;
  rule: string[];
  format: string;
  filter?: string;
  listRules?: boolean;
  ignoreRules?: string;
  profile?: string;
  compare?: boolean;
}

export function registerCheck(program: Command): void {
  program
    .command("check")
    .description("Validate package.json, exports, types, and more")
    .option("--fix", "Auto-fix package.json issues where possible")
    .option("--fix-dry-run", "Show what fixes would be applied without writing")
    .option("--fix-type <types>", "Only fix specific categories (exports,files,metadata)")
    .option("-i, --interactive", "Confirm each fix before applying (requires --fix)")
    .option("--unsafe", "Also apply unsafe fixes (requires --fix)")
    .option("--strict", "Treat warnings as errors")
    .option("--rule <spec>", "Override rule severity (e.g. exports/file-exists=off)", collect, [])
    .option("--format <fmt>", "Output format: text, json, or table", "text")
    .option("--filter <pattern>", "Filter workspace packages by name pattern")
    .option("--list-rules", "Print all available rules and exit")
    .option("--ignore-rules <ids>", "Comma-separated rule IDs to skip")
    .option("--profile <name>", "Check profile: strict, library, or app")
    .option("--compare", "Show equivalent publint/attw rule IDs alongside results")
    .action(async (options: CheckActionOptions) => {
      if (options.listRules) {
        printListRules();
        return;
      }

      const isJson = options.format === "json";
      const isTable = options.format === "table";
      if (!isJson && !isTable) {
        logger.heading("tspub check — validating your package...");
      }

      try {
        const dryRun = options.fixDryRun === true;
        const fixTypes = options.fixType
          ? options.fixType.split(",").map((s: string) => s.trim())
          : undefined;

        const severityOverrides = parseSeverityOverrides(options.rule);

        // Apply --ignore-rules
        if (options.ignoreRules) {
          for (const id of options.ignoreRules.split(",").map((s) => s.trim())) {
            if (id) severityOverrides[id] = "off";
          }
        }

        // Apply --profile
        if (options.profile && PROFILES[options.profile]) {
          const profileRules = PROFILES[options.profile]!;
          if (ALLOW_LIST_PROFILES.has(options.profile)) {
            // Allow-list: skip every rule NOT in the list
            const allowed = new Set(profileRules);
            for (const rule of allRules) {
              if (!allowed.has(rule.meta.id) && !(rule.meta.id in severityOverrides)) {
                severityOverrides[rule.meta.id] = "off";
              }
            }
          } else {
            // Deny-list: skip every rule IN the list
            for (const id of profileRules) {
              if (!(id in severityOverrides)) {
                severityOverrides[id] = "off";
              }
            }
          }
        }

        const dir = process.cwd();
        let results: CheckResult[];

        if (await isMonorepoRoot(dir)) {
          let packages = topoSort(await discoverWorkspaces(dir));
          if (options.filter) {
            packages = filterPackages(packages, options.filter);
          }

          if (!isJson && !isTable) logger.info(`Monorepo detected — checking ${packages.length} package(s)`);
          results = [];
          for (const wp of packages) {
            if (!isJson && !isTable) logger.info(`[${wp.name}] Checking...`);
            const inheritedConfig = await loadConfigWithInheritance(wp.dir, dir);
            const mergedOverrides: Record<string, Severity | "off"> = {
              ...inheritedConfig?.check?.severityOverrides,
              ...severityOverrides,
            };
            const pkgResults = await check({
              dir: wp.dir,
              fix: options.fix === true || dryRun,
              unsafe: options.unsafe === true,
              strict: options.strict === true || options.profile === "strict",
              dryRun,
              fixTypes,
              interactive: options.interactive === true,
              severityOverrides: mergedOverrides,
            });
            for (const r of pkgResults) {
              results.push({
                ...r,
                message: `[${wp.name}] ${r.message}`,
              });
            }
          }
        } else {
          results = await check({
            dir,
            fix: options.fix === true || dryRun,
            unsafe: options.unsafe === true,
            strict: options.strict === true || options.profile === "strict",
            dryRun,
            fixTypes,
            interactive: options.interactive === true,
            severityOverrides,
          });
        }

        // JSON output
        if (isJson) {
          let errors = 0;
          let warnings = 0;
          let passed = 0;
          for (const r of results) {
            if (r.severity === "error") errors++;
            else if (r.severity === "warning") warnings++;
            else if (r.severity === "ok") passed++;
          }
          console.log(
            JSON.stringify({ results, summary: { errors, warnings, passed, total: allRules.length } }, null, 2),
          );
          if (errors > 0) process.exitCode = 1;
          return;
        }

        // Table output — show resolution table then grouped
        if (isTable) {
          printResolutionTable(results);
          // Still show other results grouped
        }

        // Grouped text output
        const isStrict = options.strict === true || options.profile === "strict";
        const { errors, warnings, passed } = printGroupedResults(results, isStrict, options.compare === true);

        // Summary line
        console.log();
        const parts: string[] = [];
        if (passed > 0) parts.push(chalk.green(`✓ ${passed} passed`));
        if (errors > 0) parts.push(chalk.red(`✗ ${errors} error(s)`));
        if (warnings > 0) parts.push(chalk.yellow(`⚠ ${warnings} warning(s)`));

        if (parts.length > 0) {
          console.log(parts.join(chalk.dim(" · ")));
        }

        if (errors > 0) {
          process.exitCode = 1;
        } else if (warnings === 0 && errors === 0) {
          logger.success("All checks passed!");
        }
      } catch (err) {
        logger.error(
          `Check failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });
}

function collect(value: string, prev: string[]): string[] {
  return [...prev, value];
}
