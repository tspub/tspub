import type { Command } from "commander";
import { doctor } from "../doctor/index.js";
import { check } from "../checker/index.js";
import { debugResolution } from "../doctor/resolution.js";
import { readPackageJson } from "../shared/package-json.js";
import { logger } from "../shared/logger.js";
import { formatDoctorResults } from "../doctor/formatter.js";
import { parseSeverityOverrides } from "../checker/profiles.js";
import type { DoctorSeverity } from "../doctor/framework/types.js";

interface DoctorActionOptions {
  check?: string;
  fix?: boolean;
  unsafe?: boolean;
  dryRun?: boolean;
  profile?: string;
  rule?: string[];
  format?: string;
}

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Diagnose environment, dependencies, and package health")
    .option("--check <subpath>", "Debug resolution of a specific subpath export")
    .option("--fix", "Apply auto-fixes")
    .option("--unsafe", "Allow unsafe fixes")
    .option("--dry-run", "Preview fixes without applying")
    .option("--profile <profile>", "Use preset profile (strict, quick)")
    .option("--rule <id=severity>", "Override rule severity", collect, [])
    .option("--format <format>", "Output format: text or json", "text")
    .action(async (options: DoctorActionOptions) => {
      const dir = process.cwd();
      const format = options.format === "json" ? "json" : "text";

      if (format === "text") {
        logger.heading("tspub doctor — scanning your package...");
      }

      try {
        // Resolution debugging mode
        if (options.check) {
          const pkg = await readPackageJson(dir);
          const diags = debugResolution(pkg, options.check);
          if (format === "json") {
            console.log(JSON.stringify(diags, null, 2));
          } else {
            for (const d of diags) {
              if (d.severity === "error") logger.error(d.message);
              else if (d.severity === "warning") logger.warn(d.message);
              else logger.info(d.message);
            }
          }
          if (diags.some((d) => d.severity === "error")) {
            process.exitCode = 1;
          }
          return;
        }

        // Parse severity overrides from --rule flags
        const severityOverrides = options.rule && options.rule.length > 0
          ? parseSeverityOverrides(options.rule) as Record<string, DoctorSeverity | "off">
          : undefined;

        // Environment + doctor rules
        const envResults = await doctor({
          dir,
          fix: options.fix ?? false,
          unsafe: options.unsafe,
          dryRun: options.dryRun,
          severityOverrides,
          profile: options.profile,
          format: format as "text" | "json",
        });

        if (format === "json") {
          // Also run checker and combine
          const checkResults = await check({ dir, fix: false, strict: false });
          console.log(JSON.stringify({ doctor: envResults, check: checkResults }, null, 2));
          const hasErrors = envResults.some((r) => r.severity === "error") ||
            checkResults.some((r) => r.severity === "error");
          if (hasErrors) process.exitCode = 1;
          return;
        }

        // Format doctor results
        const formatted = envResults.map((r) => ({
          ruleId: r.ruleId ?? r.category,
          severity: r.severity,
          message: r.message,
          fixable: r.fixable,
        }));
        const { errors: doctorErrors, warnings: doctorWarnings } =
          formatDoctorResults(formatted);

        // Run checker rules too
        const results = await check({ dir, fix: false, strict: false });

        let errors = doctorErrors;
        let warnings = doctorWarnings;

        for (const result of results) {
          if (result.severity === "error") {
            logger.error(result.message);
            errors++;
          } else if (result.severity === "warning") {
            logger.warn(result.message);
            warnings++;
          } else if (result.severity === "ok") {
            logger.ok(result.message);
          } else {
            logger.info(result.message);
          }
        }

        console.log();
        if (errors > 0 || warnings > 0) {
          logger.info(
            `Found ${errors} error(s), ${warnings} warning(s).`,
          );
        } else {
          logger.success("Your package looks great!");
        }

        if (errors > 0) process.exitCode = 1;
      } catch (err) {
        logger.error(
          `Doctor failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exitCode = 1;
      }
    });
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}
