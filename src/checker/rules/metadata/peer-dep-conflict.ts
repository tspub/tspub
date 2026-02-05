import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const peerDepConflictRule: Rule = {
  meta: {
    id: "metadata/peer-dep-conflict",
    description: "Check for packages in both peer and regular dependencies",
    defaultSeverity: "warning",
    fixable: false,
    category: "metadata",
  },
  check(ctx) {
    const results: RawDiagnostic[] = [];
    if (ctx.pkg.peerDependencies) {
      for (const peer of Object.keys(ctx.pkg.peerDependencies)) {
        if (ctx.pkg.dependencies && peer in ctx.pkg.dependencies) {
          results.push({
            severity: "warning",
            message: `"${peer}" is both a peer and regular dependency`,
          });
        }
      }
    }
    return results;
  },
};
