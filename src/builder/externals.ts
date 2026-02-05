import { readFileSync } from "node:fs";
import { join } from "node:path";
import { builtinModules } from "node:module";
import type { Plugin } from "esbuild";
import { logger } from "../shared/logger.js";

const NODE_BUILTINS = new Set([
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]);

export interface ExternalResult {
  /** Exact string externals (node builtins + dep names) for esbuild's `external` */
  strings: string[];
  /** Plugin that handles subpath imports + regex externals */
  plugin: Plugin | null;
  /** Dependency names resolved from package.json (for legacy flat API) */
  depNames: string[];
}

export function resolveExternals(
  dir: string,
  userExternals?: (string | RegExp)[],
  noExternal?: string[],
): ExternalResult {
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"));
  } catch (err) {
    logger.verbose(`[externals] Could not read package.json, treating as empty: ${err instanceof Error ? err.message : String(err)}`);
    pkg = {};
  }

  const deps = new Set<string>();

  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"] as const) {
    const obj = pkg[field];
    if (obj && typeof obj === "object") {
      for (const name of Object.keys(obj as Record<string, unknown>)) {
        deps.add(name);
      }
    }
  }

  const noExternalSet = new Set(noExternal ?? []);

  // Separate string and regex user externals
  const stringExternals: string[] = [];
  const regexExternals: RegExp[] = [];

  if (userExternals) {
    for (const e of userExternals) {
      if (e instanceof RegExp) {
        regexExternals.push(e);
      } else {
        stringExternals.push(e);
      }
    }
  }

  // Add user string externals to deps
  for (const e of stringExternals) {
    deps.add(e);
  }

  // Remove noExternal entries
  for (const n of noExternalSet) {
    deps.delete(n);
  }

  // Node builtins go as exact strings — esbuild handles them natively
  const exactStrings: string[] = [...NODE_BUILTINS];

  // Dep names need subpath matching via plugin
  const depNames = [...deps];

  // We need a plugin if we have dep names (for subpath matching) or regex externals
  const needsPlugin = depNames.length > 0 || regexExternals.length > 0;

  const plugin: Plugin | null = needsPlugin
    ? createExternalPlugin(depNames, regexExternals, noExternalSet)
    : null;

  return { strings: exactStrings, plugin, depNames };
}

function createExternalPlugin(
  depNames: string[],
  regexExternals: RegExp[],
  noExternalSet: Set<string>,
): Plugin {
  return {
    name: "tspub-externals",
    setup(build) {
      // Match bare specifiers (not relative/absolute paths)
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        const id = args.path;

        // Check noExternal first
        for (const n of noExternalSet) {
          if (id === n || id.startsWith(n + "/")) {
            return undefined;
          }
        }

        // Check regex externals (reset lastIndex to avoid stateful g-flag issues)
        for (const re of regexExternals) {
          re.lastIndex = 0;
          if (re.test(id)) {
            return { path: id, external: true };
          }
        }

        // Check dep names with subpath support
        for (const dep of depNames) {
          if (id === dep || id.startsWith(dep + "/")) {
            return { path: id, external: true };
          }
        }

        return undefined;
      });
    },
  };
}

/**
 * Legacy API: returns flat string array for backward compatibility with tests.
 * Delegates to resolveExternals() and flattens the result.
 * @deprecated Use resolveExternals() which returns ExternalResult instead.
 */
export function resolveExternalsFlat(
  dir: string,
  userExternals?: (string | RegExp)[],
  noExternal?: string[],
): string[] {
  const result = resolveExternals(dir, userExternals, noExternal);
  return [...new Set([...result.strings, ...result.depNames])];
}
