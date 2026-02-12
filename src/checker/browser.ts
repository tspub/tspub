/**
 * Browser-safe checker subset.
 *
 * Exports only rules that operate on PackageJson and compilerOptions alone —
 * no filesystem access, no Node.js built-ins. Safe to import in VitePress
 * or any browser environment.
 *
 * 37 of 68 rules. Install tspub for all 68.
 */

import type { PackageJson } from "../shared/package-json.js";
import type { Rule, CheckContext, RawDiagnostic, Severity } from "./framework/types.js";
import { RULE_MAPPING, CATEGORY_ORDER } from "./profiles.js";

// --- Exports rules (browser-safe) ---
import { typeModuleRule } from "./rules/exports/type-module.js";
import { typesOrderRule } from "./rules/exports/types-order.js";
import { valueInvalidRule } from "./rules/exports/value-invalid.js";
import { defaultLastRule } from "./rules/exports/default-last.js";
import { moduleBeforeRequireRule } from "./rules/exports/module-before-require.js";
import { importsFieldRule } from "./rules/exports/imports-field.js";
import { jsxExtensionsRule } from "./rules/exports/jsx-extensions.js";
import { fallbackArrayRule } from "./rules/exports/fallback-array.js";
import { typesFormatRule } from "./rules/exports/types-format.js";
import { conditionTypesRule } from "./rules/exports/condition-types.js";
import { noDeprecatedSubpathRule } from "./rules/exports/no-deprecated-subpath-mapping.js";
import { importsKeyInvalidRule } from "./rules/exports/imports-key-invalid.js";
import { browserConflictRule } from "./rules/exports/browser-conflict.js";
import { browserValueConflictRule } from "./rules/exports/browser-value-conflict.js";
import { typesFirstRule } from "./rules/exports/types-first.js";
import { moduleNoExportsRule } from "./rules/exports/module-no-exports.js";
import { typesNotExportedRule } from "./rules/exports/types-not-exported.js";

// --- Imports rules (browser-safe) ---
import { importsDefaultLastRule } from "./rules/imports/default-last.js";
import { importsModuleBeforeRequireRule } from "./rules/imports/module-before-require.js";
import { importsFallbackArrayRule } from "./rules/imports/fallback-array.js";
import { importsNoDeprecatedSubpathRule } from "./rules/imports/no-deprecated-subpath.js";

// --- Types rules (browser-safe — need only compilerOptions) ---
import { strictRule } from "./rules/types/strict.js";
import { moduleRule } from "./rules/types/module.js";
import { moduleResolutionRule } from "./rules/types/module-resolution.js";
import { isolatedModulesRule } from "./rules/types/isolated-modules.js";
import { esmDynamicOnlyRule } from "./rules/types/esm-dynamic-only.js";
import { cjsResolvesToEsmRule } from "./rules/types/cjs-resolves-esm.js";

// --- Files rules (browser-safe — need only pkg) ---
import { filesFieldRule } from "./rules/files/files-field.js";
import { prepublishRule } from "./rules/files/prepublish.js";
import { duplicateDepRule } from "./rules/files/duplicate-dep.js";
import { localDependencyRule } from "./rules/files/local-dependency.js";

// --- Metadata rules (browser-safe — need only pkg) ---
import { sideEffectsRule } from "./rules/metadata/side-effects.js";
import { enginesRule } from "./rules/metadata/engines.js";
import { repositoryRule } from "./rules/metadata/repository.js";
import { peerDepConflictRule } from "./rules/metadata/peer-dep-conflict.js";
import { deprecatedFieldsRule } from "./rules/metadata/deprecated-fields.js";
import { useExportsBrowserRule } from "./rules/metadata/use-exports-browser.js";
import { repositoryFormatRule } from "./rules/metadata/repository-format.js";
import { fieldValueTypeRule } from "./rules/metadata/field-value-type.js";

export const browserRules: Rule[] = [
  // Exports
  typeModuleRule,
  typesOrderRule,
  valueInvalidRule,
  defaultLastRule,
  moduleBeforeRequireRule,
  importsFieldRule,
  jsxExtensionsRule,
  fallbackArrayRule,
  typesFormatRule,
  conditionTypesRule,
  noDeprecatedSubpathRule,
  importsKeyInvalidRule,
  browserConflictRule,
  browserValueConflictRule,
  typesFirstRule,
  moduleNoExportsRule,
  typesNotExportedRule,

  // Imports
  importsDefaultLastRule,
  importsModuleBeforeRequireRule,
  importsFallbackArrayRule,
  importsNoDeprecatedSubpathRule,

  // Types
  strictRule,
  moduleRule,
  moduleResolutionRule,
  isolatedModulesRule,
  esmDynamicOnlyRule,
  cjsResolvesToEsmRule,

  // Files
  filesFieldRule,
  prepublishRule,
  duplicateDepRule,
  localDependencyRule,

  // Metadata
  sideEffectsRule,
  enginesRule,
  repositoryRule,
  peerDepConflictRule,
  deprecatedFieldsRule,
  useExportsBrowserRule,
  repositoryFormatRule,
  fieldValueTypeRule,
];

export const TOTAL_RULES = 70;

export interface BrowserCheckResult {
  ruleId: string;
  severity: string;
  message: string;
  category: string;
  fixable: false | "safe" | "unsafe";
  publint: string | null;
  attw: string | null;
}

export function checkPackageJson(
  pkg: PackageJson,
  compilerOptions?: Record<string, unknown> | null,
): BrowserCheckResult[] {
  const ctx: CheckContext = {
    pkg,
    dir: "",
    compilerOptions: compilerOptions ?? null,
    hasBuildOutput: true,
    distFiles: [],
    allJsFiles: [],
    hasUnresolvedExtends: false,
  };

  const results: BrowserCheckResult[] = [];

  for (const rule of browserRules) {
    try {
      // All browser-safe rules are synchronous
      const diags = rule.check(ctx) as RawDiagnostic[];
      for (const d of diags) {
        const mapping = RULE_MAPPING[rule.meta.id];
        results.push({
          ruleId: rule.meta.id,
          severity: d.severity,
          message: d.message,
          category: rule.meta.id.split("/")[0]!,
          fixable: rule.meta.fixable,
          publint: mapping?.publint ?? null,
          attw: mapping?.attw ?? null,
        });
      }
    } catch {
      // Rule threw — skip in browser mode
    }
  }

  return results;
}

export function fixPackageJson(
  pkg: PackageJson,
  results: BrowserCheckResult[],
): PackageJson {
  const cloned = structuredClone(pkg);

  for (const result of results) {
    if (!result.fixable) continue;
    const rule = browserRules.find((r) => r.meta.id === result.ruleId);
    if (!rule?.fix) continue;
    try {
      rule.fix({ pkg: cloned, dir: "", distFiles: [] });
    } catch {
      // Fix failed — skip
    }
  }

  return cloned;
}

export { RULE_MAPPING, CATEGORY_ORDER };
export type { PackageJson } from "../shared/package-json.js";
