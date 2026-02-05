import type { Rule, RawDiagnostic } from "../../framework/types.js";

const DEP_FIELDS = ["dependencies", "devDependencies", "peerDependencies"] as const;

export const localDependencyRule: Rule = {
  meta: {
    id: "files/local-dependency",
    description: "Error on file:/link: protocol deps, warn on workspace: protocol",
    defaultSeverity: "error",
    fixable: false,
    category: "files",
  },
  check(ctx) {
    const results: RawDiagnostic[] = [];
    for (const field of DEP_FIELDS) {
      const deps = ctx.pkg[field];
      if (!deps || typeof deps !== "object") continue;
      for (const [name, version] of Object.entries(deps as Record<string, string>)) {
        if (typeof version !== "string") continue;
        if (version.startsWith("file:") || version.startsWith("link:")) {
          results.push({
            severity: "error",
            message: `${field} "${name}" uses local protocol "${version}" which will not work for published packages`,
          });
        } else if (version.startsWith("workspace:")) {
          results.push({
            severity: "warning",
            message: `${field} "${name}" uses "workspace:" protocol — ensure it is resolved before publishing`,
          });
        }
      }
    }
    return results;
  },
};
