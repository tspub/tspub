import { check } from "../../checker/index.js";
import type { PrereqRule } from "../framework/types.js";

export const checkerPassRule: PrereqRule = {
  meta: {
    id: "prereq/no-check-errors",
    description: "tspub check must pass",
    blocking: true,
  },
  async check(ctx) {
    const results = await check({ dir: ctx.dir, fix: false, strict: false });
    const errors = results.filter((r) => r.severity === "error");
    if (errors.length > 0) {
      return [
        {
          severity: "error",
          message: `tspub check found ${errors.length} error(s). Fix errors before publishing.`,
          ruleId: "prereq/no-check-errors",
        },
        ...errors.map((e) => ({
          severity: "error" as const,
          message: e.message,
          ruleId: "prereq/no-check-errors",
        })),
      ];
    }
    return [];
  },
};
