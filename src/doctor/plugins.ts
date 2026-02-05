import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { DoctorRule } from "./framework/types.js";

export interface TspubDoctorPlugin {
  name: string;
  rules: DoctorRule[];
}

export async function loadDoctorPlugins(
  specs: string[],
  dir: string,
): Promise<DoctorRule[]> {
  const rules: DoctorRule[] = [];

  for (const spec of specs) {
    let mod: Record<string, unknown>;
    try {
      if (spec.startsWith(".") || spec.startsWith("/")) {
        const absPath = spec.startsWith("/") ? spec : resolve(dir, spec);
        const url = pathToFileURL(absPath);
        mod = (await import(url.href)) as Record<string, unknown>;
      } else {
        mod = (await import(spec)) as Record<string, unknown>;
      }
    } catch (err) {
      throw new Error(
        `Failed to load doctor plugin "${spec}": ${err instanceof Error ? err.message : String(err)}`,
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

function extractPlugin(
  mod: Record<string, unknown>,
  spec: string,
): TspubDoctorPlugin {
  if (Array.isArray(mod["rules"])) {
    return {
      name: (mod["name"] as string) ?? spec,
      rules: mod["rules"] as DoctorRule[],
    };
  }

  const def = mod["default"] as Record<string, unknown> | undefined;
  if (def && Array.isArray(def["rules"])) {
    return {
      name: (def["name"] as string) ?? spec,
      rules: def["rules"] as DoctorRule[],
    };
  }

  throw new Error(
    `Doctor plugin "${spec}" must export { rules: DoctorRule[] } or { default: { rules: DoctorRule[] } }`,
  );
}

function validateRule(rule: DoctorRule, spec: string): void {
  if (!rule.meta?.id) {
    throw new Error(`Doctor plugin "${spec}" has a rule without meta.id`);
  }
  if (!rule.meta.category) {
    throw new Error(
      `Doctor plugin "${spec}" rule "${rule.meta.id}" is missing meta.category`,
    );
  }
  if (typeof rule.check !== "function") {
    throw new Error(
      `Doctor plugin "${spec}" rule "${rule.meta.id}" is missing check function`,
    );
  }
}
