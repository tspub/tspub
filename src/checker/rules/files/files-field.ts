import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const filesFieldRule: Rule = {
  meta: {
    id: "files/files-field",
    description: "Check that files field exists and is configured correctly",
    defaultSeverity: "warning",
    fixable: "safe",
    category: "files",
  },
  check(ctx) {
    const results: RawDiagnostic[] = [];

    if (!ctx.pkg.files) {
      results.push({
        severity: "info",
        message:
          '"files" field missing — consider adding "files": ["dist"] to control what gets published',
      });
      return results;
    }

    if (ctx.pkg.files.includes("src") || ctx.pkg.files.includes("src/")) {
      results.push({
        severity: "warning",
        message: '"files" includes "src/" — shipping source unnecessarily',
      });
    }

    if (
      ctx.pkg.files.includes("test") ||
      ctx.pkg.files.includes("test/") ||
      ctx.pkg.files.includes("tests") ||
      ctx.pkg.files.includes("tests/")
    ) {
      results.push({
        severity: "warning",
        message:
          '"files" includes test directory — shipping tests unnecessarily',
      });
    }

    const buildDirs = getBuildDirs(ctx.pkg);
    const likelyIncludesBuildOutput = ctx.pkg.files.some((f) => {
      const normalized = f.replace(/^\//, "").replace(/\/$/, "");
      // Globs or JS files at build-dir level count as build output
      if (buildDirs.some((d) => normalized === d || normalized.startsWith(d + "/"))) return true;
      // Top-level JS/glob entries likely ship build output
      if (!normalized.includes("/") && (f.includes("*") || f.endsWith(".js") || f.endsWith(".cjs") || f.endsWith(".mjs"))) return true;
      return false;
    });
    if (!likelyIncludesBuildOutput) {
      results.push({
        severity: "info",
        message:
          '"files" does not include a build output directory (dist/, lib/, build/)',
      });
    }

    return results;
  },
  fix(ctx) {
    const messages: string[] = [];
    let modified = false;

    if (!ctx.pkg.files) {
      ctx.pkg.files = ["dist"];
      modified = true;
      messages.push('set "files": ["dist"]');
    } else {
      if (ctx.pkg.files.includes("src") || ctx.pkg.files.includes("src/")) {
        ctx.pkg.files = ctx.pkg.files.filter(
          (f) => f !== "src" && f !== "src/",
        );
        modified = true;
        messages.push('removed "src" from files');
      }
      if (
        ctx.pkg.files.includes("test") ||
        ctx.pkg.files.includes("test/") ||
        ctx.pkg.files.includes("tests") ||
        ctx.pkg.files.includes("tests/")
      ) {
        ctx.pkg.files = ctx.pkg.files.filter(
          (f) =>
            f !== "test" && f !== "test/" && f !== "tests" && f !== "tests/",
        );
        modified = true;
        messages.push("removed test directory from files");
      }
    }

    return {
      message: messages.join("; "),
      pkgModified: modified,
    };
  },
};

function getBuildDirs(pkg: {
  main?: string;
  types?: string;
  module?: string;
}): string[] {
  const dirs = new Set(["dist", "lib", "build", "out", "source"]);
  for (const field of [pkg.main, pkg.types, pkg.module]) {
    if (field) {
      const segment = field.replace(/^\.\//, "").split("/")[0];
      if (segment && !segment.includes(".")) {
        dirs.add(segment);
      }
    }
  }
  return [...dirs];
}
