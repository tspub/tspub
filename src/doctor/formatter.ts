import chalk from "chalk";
import { logger } from "../shared/logger.js";
import type { DoctorSeverity } from "./framework/types.js";

export interface DoctorFormattedResult {
  ruleId: string;
  severity: DoctorSeverity;
  message: string;
  fixable?: false | "safe" | "unsafe";
}

const CATEGORY_ORDER = ["environment", "typescript", "build", "dependencies"];

export function formatDoctorResults(
  results: DoctorFormattedResult[],
  format: "text" | "json" = "text",
): { errors: number; warnings: number } {
  if (format === "json") {
    console.log(JSON.stringify(results, null, 2));
    return countSeverities(results);
  }

  const grouped = new Map<string, DoctorFormattedResult[]>();
  for (const cat of CATEGORY_ORDER) {
    grouped.set(cat, []);
  }

  for (const r of results) {
    const cat = r.ruleId.split("/")[0] ?? "other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(r);
  }

  for (const [category, catResults] of grouped) {
    if (catResults.length === 0) continue;

    console.log();
    console.log(chalk.bold.cyan(`── ${category} ──`));

    for (const result of catResults) {
      const fixHint =
        result.fixable
          ? chalk.dim(` [fixable: ${result.fixable}]`)
          : "";

      if (result.severity === "error") {
        logger.error(result.message + fixHint);
      } else if (result.severity === "warning") {
        logger.warn(result.message + fixHint);
      } else {
        logger.info(result.message + fixHint);
      }
    }
  }

  return countSeverities(results);
}

function countSeverities(results: DoctorFormattedResult[]): {
  errors: number;
  warnings: number;
} {
  let errors = 0;
  let warnings = 0;
  for (const r of results) {
    if (r.severity === "error") errors++;
    else if (r.severity === "warning") warnings++;
  }
  return { errors, warnings };
}
