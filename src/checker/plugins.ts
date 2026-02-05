import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Rule } from "./framework/types.js";

export interface TspubPlugin {
  name: string;
  rules: Rule[];
}

export async function loadPlugins(specs: string[], dir: string): Promise<Rule[]> {
  const rules: Rule[] = [];

  for (const spec of specs) {
    let mod: Record<string, unknown>;
    try {
      if (spec.startsWith(".") || spec.startsWith("/")) {
        // Relative or absolute path
        const absPath = spec.startsWith("/") ? spec : resolve(dir, spec);
        const url = pathToFileURL(absPath);
        mod = await import(url.href) as Record<string, unknown>;
      } else {
        // Package name — use bare specifier
        mod = await import(spec) as Record<string, unknown>;
      }
    } catch (err) {
      throw new Error(
        `Failed to load plugin "${spec}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const plugin = extractPlugin(mod, spec);
    for (const rule of plugin.rules) {
      validateRule(rule, spec);
      rules.push(rule);
    }
  }

  return rules;
}

function extractPlugin(mod: Record<string, unknown>, spec: string): TspubPlugin {
  // Try direct export: { rules: Rule[] }
  if (Array.isArray(mod["rules"])) {
    return {
      name: (mod["name"] as string) ?? spec,
      rules: mod["rules"] as Rule[],
    };
  }

  // Try default export: { default: { rules: Rule[] } }
  const def = mod["default"] as Record<string, unknown> | undefined;
  if (def && Array.isArray(def["rules"])) {
    return {
      name: (def["name"] as string) ?? spec,
      rules: def["rules"] as Rule[],
    };
  }

  throw new Error(
    `Plugin "${spec}" must export { rules: Rule[] } or { default: { rules: Rule[] } }`,
  );
}

function validateRule(rule: Rule, spec: string): void {
  if (!rule.meta?.id) {
    throw new Error(`Plugin "${spec}" has a rule without meta.id`);
  }
  if (!rule.meta.category) {
    throw new Error(`Plugin "${spec}" rule "${rule.meta.id}" is missing meta.category`);
  }
  if (typeof rule.check !== "function") {
    throw new Error(`Plugin "${spec}" rule "${rule.meta.id}" is missing check function`);
  }
}
