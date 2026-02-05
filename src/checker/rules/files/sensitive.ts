import { join } from "node:path";
import { readFileSync } from "node:fs";
import type { Rule, RawDiagnostic } from "../../framework/types.js";
import { fileExists } from "../../../shared/resolve.js";

const SENSITIVE_FILES = [
  ".env",
  ".env.local",
  ".env.production",
  "credentials.json",
  "id_rsa",
  "id_ed25519",
  ".aws",
];

function npmrcHasSecrets(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, "utf-8");
    return /_authToken|_auth=|_password/.test(content);
  } catch {
    return false;
  }
}

export const sensitiveRule: Rule = {
  meta: {
    id: "files/sensitive",
    description: "Check for sensitive files in published package and dist",
    defaultSeverity: "error",
    fixable: false,
    category: "files",
  },
  async check(ctx) {
    const results: RawDiagnostic[] = [];

    // Check root sensitive files
    for (const sensitive of SENSITIVE_FILES) {
      if (await fileExists(join(ctx.dir, sensitive))) {
        const inFiles =
          !ctx.pkg.files ||
          ctx.pkg.files.some(
            (f) => f === sensitive || f === "." || sensitive.startsWith(f + "/"),
          );
        if (inFiles) {
          results.push({
            severity: "error",
            message: `Sensitive file "${sensitive}" may be included in published package`,
          });
        }
      }
    }

    // Check .npmrc separately — only flag if it contains auth tokens
    const npmrcPath = join(ctx.dir, ".npmrc");
    if (await fileExists(npmrcPath)) {
      const inFiles =
        !ctx.pkg.files ||
        ctx.pkg.files.some(
          (f) => f === ".npmrc" || f === "." || ".npmrc".startsWith(f + "/"),
        );
      if (inFiles && npmrcHasSecrets(npmrcPath)) {
        results.push({
          severity: "error",
          message: 'Sensitive file ".npmrc" contains auth tokens and may be included in published package',
        });
      }
    }

    // Check dist sensitive files
    for (const file of ctx.distFiles) {
      if (SENSITIVE_FILES.some((s) => file.includes(s))) {
        results.push({
          severity: "error",
          message: `Sensitive file found in dist/: ${file}`,
        });
      }
    }

    return results;
  },
};
