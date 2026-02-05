import type { Rule, RawDiagnostic } from "../../framework/types.js";

const GIT_URL_RE = /^(?:https?:\/\/|git(?:\+https?)?:\/\/|git@)[\w.-]+[/:][\w./-]+(?:\.git)?$/;

const SHORTHAND_RE = /^[\w-]+\/[\w.-]+$/;

/**
 * Validates that the repository field has a proper format.
 * Accepts:
 * - Object form: { type: "git", url: "..." }
 * - Shorthand: "user/repo"
 * - Full URL string
 *
 * Equivalent to publint: INVALID_REPOSITORY_VALUE
 */
export const repositoryFormatRule: Rule = {
  meta: {
    id: "metadata/repository-format",
    description: "Check that repository field has a valid format",
    defaultSeverity: "warning",
    fixable: false,
    category: "metadata",
  },
  check(ctx) {
    const repo = ctx.pkg.repository;
    if (!repo) return []; // existence checked by metadata/repository

    if (typeof repo === "string") {
      if (SHORTHAND_RE.test(repo) || GIT_URL_RE.test(repo)) {
        return [];
      }
      // Could be a plain URL
      try {
        new URL(repo);
        return [];
      } catch {
        return [
          {
            severity: "warning",
            message: `"repository" value "${repo}" is not a valid git URL or shorthand (expected "user/repo" or a URL)`,
          },
        ];
      }
    }

    if (typeof repo === "object" && repo !== null) {
      const obj = repo as Record<string, unknown>;
      if (!obj["url"] || typeof obj["url"] !== "string") {
        return [
          {
            severity: "warning",
            message: '"repository" object is missing a "url" field',
          },
        ];
      }
      const url = obj["url"] as string;
      if (!GIT_URL_RE.test(url)) {
        try {
          new URL(url);
          return [];
        } catch {
          return [
            {
              severity: "warning",
              message: `"repository.url" value "${url}" is not a valid git URL`,
            },
          ];
        }
      }
      return [];
    }

    return [
      {
        severity: "warning",
        message: '"repository" should be a string ("user/repo") or object with "url"',
      },
    ];
  },
};
