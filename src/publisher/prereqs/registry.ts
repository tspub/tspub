import { pingRegistry, checkAuth } from "../npm.js";
import type { PrereqRule } from "../framework/types.js";

export const registryPingRule: PrereqRule = {
  meta: {
    id: "prereq/registry-reachable",
    description: "npm registry must be reachable",
    blocking: true,
  },
  check(ctx) {
    if (ctx.dryRun) return [];
    const { ok } = pingRegistry(ctx.dir, ctx.registryArgs);
    if (!ok) {
      return [
        {
          severity: "error",
          message: "Cannot reach npm registry. Check your connection.",
          ruleId: "prereq/registry-reachable",
        },
      ];
    }
    return [];
  },
};

export const registryAuthRule: PrereqRule = {
  meta: {
    id: "prereq/registry-authenticated",
    description: "Must be authenticated with npm",
    blocking: true,
  },
  check(ctx) {
    if (ctx.dryRun) return [];
    const { ok } = checkAuth(ctx.dir, ctx.registryArgs);
    if (!ok) {
      return [
        {
          severity: "error",
          message: "Not authenticated with npm. Run `npm login` first.",
          ruleId: "prereq/registry-authenticated",
        },
      ];
    }
    return [];
  },
};
