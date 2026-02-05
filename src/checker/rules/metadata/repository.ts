import type { Rule } from "../../framework/types.js";

export const repositoryRule: Rule = {
  meta: {
    id: "metadata/repository",
    description: "Check that repository field exists",
    defaultSeverity: "info",
    fixable: false,
    category: "metadata",
  },
  check(ctx) {
    if (!ctx.pkg.repository) {
      return [
        {
          severity: "info",
          message: '"repository" field missing — consider adding it',
        },
      ];
    }
    return [];
  },
};
