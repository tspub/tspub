import { checkDirtyTree } from "../git.js";
import type { PrereqRule } from "../framework/types.js";

export const dirtyTreeRule: PrereqRule = {
  meta: {
    id: "prereq/clean-tree",
    description: "Working tree must be clean",
    blocking: true,
  },
  check(ctx) {
    if (ctx.dryRun) return [];
    const { dirty, error } = checkDirtyTree(ctx.dir);
    if (error) {
      return [
        {
          severity: "warning",
          message: "Not a git repository — skipping git checks",
          ruleId: "prereq/clean-tree",
        },
      ];
    }
    if (dirty) {
      return [
        {
          severity: "error",
          message: "Working tree is dirty. Commit or stash changes before publishing.",
          ruleId: "prereq/clean-tree",
        },
      ];
    }
    return [];
  },
};
