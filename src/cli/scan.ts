import type { Command } from "commander";
import { writeFileSync } from "node:fs";
import { scan } from "../scanner/index.js";
import { generateMarkdownReport } from "../scanner/report.js";
import { parseSeverityOverrides } from "../checker/profiles.js";
import { logger } from "../shared/logger.js";

interface ScanActionOptions {
  top?: number;
  json: boolean;
  fix: boolean;
  concurrency?: number;
  minStars?: number;
  query?: string;
  profile?: string;
  report?: string;
  rule?: string[];
}

export function registerScan(program: Command): void {
  program
    .command("scan [url]")
    .description("Scan GitHub repos for TypeScript packaging issues")
    .option("--top <n>", "Discover and scan top N TypeScript npm packages", parseInt)
    .option("--json", "Output results as JSON", false)
    .option("--fix", "Report what --fix would change in each package", false)
    .option("--concurrency <n>", "Parallel clone concurrency", parseInt)
    .option("--min-stars <n>", "Minimum GitHub stars", parseInt)
    .option("--query <q>", "Custom GitHub search query")
    .option("--profile <p>", "Check profile (strict, exports-only, types-only)")
    .option("--report <path>", "Save markdown report to file")
    .option("--rule <id=severity>", "Override rule severity", collect, [])
    .action(async (url: string | undefined, options: ScanActionOptions) => {
      if (!url && !options.top) {
        logger.error("Provide a GitHub URL or use --top <n>");
        process.exitCode = 1;
        return;
      }

      if (!options.json) {
        const fixLabel = options.fix ? " (with fix preview)" : "";
        logger.heading(
          `tspub scan — scanning ${url ? url : `top ${options.top} repos`}${fixLabel}...`,
        );
      }

      try {
        const severityOverrides =
          options.rule && options.rule.length > 0
            ? parseSeverityOverrides(options.rule)
            : undefined;

        const results = await scan(
          {
            url,
            top: options.top,
            json: options.json,
            fix: options.fix,
            concurrency: options.concurrency,
            minStars: options.minStars,
            query: options.query,
            severityOverrides,
            profile: options.profile,
          },
          options.json ? undefined : (msg) => logger.dim(msg),
        );

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        // Print per-repo results
        for (const result of results) {
          // Print scan-level errors
          if (result.errors) {
            for (const err of result.errors) {
              logger.error(`[${err.repo}] ${err.phase}: ${err.message}`);
            }
          }

          for (const pkg of result.packages) {
            for (const r of pkg.results) {
              if (r.severity === "error") {
                logger.error(`${pkg.name}: ${r.message}`);
              } else if (r.severity === "warning") {
                logger.warn(`${pkg.name}: ${r.message}`);
              }
            }

            if (pkg.fixChanges && pkg.fixChanges.length > 0) {
              logger.info(`${pkg.name}: --fix would change:`);
              for (const change of pkg.fixChanges) {
                if (change.before === null || change.before === undefined) {
                  logger.dim(`  + ${change.field}: ${JSON.stringify(change.after)}`);
                } else {
                  logger.dim(`  ~ ${change.field}: ${JSON.stringify(change.before)} → ${JSON.stringify(change.after)}`);
                }
              }
            }
          }
        }

        // Summary
        const totalRepos = results.length;
        const totalPackages = results.reduce((sum, r) => sum + r.packages.length, 0);
        const withErrors = results.filter((r) =>
          r.packages.some((p) => p.errors > 0),
        ).length;
        const withWarningsOnly = results.filter(
          (r) =>
            r.packages.some((p) => p.warnings > 0) &&
            !r.packages.some((p) => p.errors > 0),
        ).length;
        const clean = totalRepos - withErrors - withWarningsOnly;

        console.log();
        logger.heading("=== RESULTS ===");
        logger.info(`${totalRepos} repos scanned, ${totalPackages} packages checked`);
        if (clean > 0) logger.ok(`${clean} clean`);
        if (withWarningsOnly > 0) logger.warn(`${withWarningsOnly} with warnings only`);
        if (withErrors > 0) logger.error(`${withErrors} with errors`);

        // Fix summary
        if (options.fix) {
          const fixablePackages = results.flatMap((r) => r.packages).filter(
            (p) => p.fixChanges && p.fixChanges.length > 0,
          );
          const totalFixFields = fixablePackages.reduce(
            (sum, p) => sum + (p.fixChanges?.length ?? 0),
            0,
          );
          if (fixablePackages.length > 0) {
            console.log();
            logger.info(
              `${fixablePackages.length} package(s) fixable, ${totalFixFields} field(s) would change`,
            );
            const fieldCounts = new Map<string, number>();
            for (const pkg of fixablePackages) {
              for (const change of pkg.fixChanges!) {
                fieldCounts.set(change.field, (fieldCounts.get(change.field) ?? 0) + 1);
              }
            }
            const sortedFields = [...fieldCounts.entries()].sort((a, b) => b[1] - a[1]);
            for (const [field, count] of sortedFields) {
              logger.dim(`  ${count}x  ${field}`);
            }
          } else {
            logger.ok("Nothing to fix");
          }
        }

        // Top issues
        const issueCounts = new Map<string, number>();
        for (const result of results) {
          for (const pkg of result.packages) {
            for (const r of pkg.results) {
              if (r.severity === "error" || r.severity === "warning") {
                issueCounts.set(r.message, (issueCounts.get(r.message) ?? 0) + 1);
              }
            }
          }
        }

        if (issueCounts.size > 0) {
          console.log();
          logger.info("Top issues:");
          const sorted = [...issueCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
          for (const [msg, count] of sorted) {
            logger.dim(`  ${count}x  ${msg}`);
          }
        }

        // Save report if requested
        if (options.report) {
          const report = generateMarkdownReport(results);
          writeFileSync(options.report, report);
          logger.info(`Report saved to ${options.report}`);
        }

        if (withErrors > 0) {
          process.exitCode = 1;
        }
      } catch (err) {
        logger.error(
          `Scan failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}
