import type { DoctorRule } from "../framework/types.js";

export const fileDependencyRule: DoctorRule = {
  meta: {
    id: "dependencies/no-file-deps",
    description: "Warn on file: dependencies",
    defaultSeverity: "warning",
    fixable: false,
    category: "dependencies",
  },
  check(ctx) {
    const results: Array<{ severity: "warning"; message: string }> = [];
    for (const [name, version] of Object.entries(ctx.pkg.dependencies ?? {})) {
      if (version.startsWith("file:")) {
        results.push({
          severity: "warning",
          message: `Dependency "${name}" uses file: protocol. This won't work for published packages.`,
        });
      }
    }
    return results;
  },
};

export const duplicateDependencyRule: DoctorRule = {
  meta: {
    id: "dependencies/no-duplicates",
    description: "Warn when a package appears in both dependencies and devDependencies",
    defaultSeverity: "warning",
    fixable: "safe",
    category: "dependencies",
  },
  check(ctx) {
    const deps = ctx.pkg.dependencies ?? {};
    const devDeps = ctx.pkg.devDependencies ?? {};
    const duplicates = Object.keys(deps).filter((name) => name in devDeps);

    if (duplicates.length > 0) {
      return [
        {
          severity: "warning",
          message: `Package(s) in both dependencies and devDependencies: ${duplicates.join(", ")}`,
        },
      ];
    }
    return [];
  },
  fix(ctx) {
    const deps = ctx.pkg.dependencies ?? {};
    const devDeps = ctx.pkg.devDependencies;
    if (!devDeps) return { message: "", pkgModified: false };

    const duplicates = Object.keys(deps).filter((name) => name in devDeps);
    if (duplicates.length === 0) return { message: "", pkgModified: false };

    for (const name of duplicates) {
      delete devDeps[name];
    }
    return {
      message: `Removed ${duplicates.join(", ")} from devDependencies (kept in dependencies)`,
      pkgModified: true,
    };
  },
};

export const missingPeerDepRule: DoctorRule = {
  meta: {
    id: "dependencies/peer-dep-installed",
    description: "Check peer dependencies are installed",
    defaultSeverity: "warning",
    fixable: false,
    category: "dependencies",
  },
  check(ctx) {
    const peerDeps = ctx.pkg.peerDependencies;
    if (!peerDeps) return [];

    const deps = ctx.pkg.dependencies ?? {};
    const devDeps = ctx.pkg.devDependencies ?? {};
    const results: Array<{ severity: "warning"; message: string }> = [];

    for (const name of Object.keys(peerDeps)) {
      if (!(name in deps) && !(name in devDeps)) {
        results.push({
          severity: "warning",
          message: `Peer dependency "${name}" is not installed in dependencies or devDependencies.`,
        });
      }
    }
    return results;
  },
};

export const dependencyRules: DoctorRule[] = [
  fileDependencyRule,
  duplicateDependencyRule,
  missingPeerDepRule,
];
