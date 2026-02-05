import { checkBranch } from "../git.js";
import type { PrereqRule } from "../framework/types.js";

export const branchRule: PrereqRule = {
  meta: {
    id: "prereq/allowed-branch",
    description: "Must be on an allowed branch",
    blocking: true,
  },
  check(ctx) {
    if (ctx.isCi || ctx.dryRun) return [];
    const allowedBranches = ctx.config?.branch
      ? Array.isArray(ctx.config.branch)
        ? ctx.config.branch
        : [ctx.config.branch]
      : ["main", "master"];

    const { ok, branch } = checkBranch(ctx.dir, allowedBranches);
    if (!ok) {
      return [
        {
          severity: "error",
          message: `Current branch "${branch}" is not allowed. Expected: ${allowedBranches.join(", ")}`,
          ruleId: "prereq/allowed-branch",
        },
      ];
    }
    return [];
  },
};
