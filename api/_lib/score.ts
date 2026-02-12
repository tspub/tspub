import type { Severity } from "../../src/checker/framework/types.js";

export interface CheckResultForScore {
  severity: string;
  ruleId?: string;
}

export interface ScoreResult {
  total: number;
  grade: string;
  categories: Record<string, number>;
}

const WEIGHTS: Record<string, number> = {
  exports: 35,
  types: 25,
  files: 15,
  metadata: 15,
  size: 10,
};

export function computeScore(results: CheckResultForScore[]): ScoreResult {
  const byCategory: Record<string, CheckResultForScore[]> = {};
  for (const r of results) {
    if (!r.ruleId) continue;
    const cat = r.ruleId.split("/")[0] ?? "other";
    (byCategory[cat] ??= []).push(r);
  }

  const categoryScores: Record<string, number> = {};
  for (const [cat, catResults] of Object.entries(byCategory)) {
    const errors = catResults.filter((r) => r.severity === "error").length;
    const warnings = catResults.filter((r) => r.severity === "warning").length;
    const total = catResults.length;
    const earned = total - errors - warnings * 0.5;
    categoryScores[cat] = total > 0 ? Math.round((earned / total) * 100) : 100;
  }

  let totalScore = 0;
  for (const [cat, weight] of Object.entries(WEIGHTS)) {
    totalScore += ((categoryScores[cat] ?? 100) * weight) / 100;
  }
  const total = Math.round(totalScore);

  const grade =
    total >= 95 ? "A+" :
    total >= 90 ? "A" :
    total >= 85 ? "B+" :
    total >= 80 ? "B" :
    total >= 70 ? "C" :
    total >= 50 ? "D" : "F";

  return { total, grade, categories: categoryScores };
}

export function gradeColor(grade: string): string {
  if (grade === "A+" || grade === "A") return "brightgreen";
  if (grade === "B+" || grade === "B") return "yellowgreen";
  if (grade === "C") return "yellow";
  if (grade === "D") return "orange";
  return "red";
}
