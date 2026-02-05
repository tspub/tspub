import type { Rule } from "../framework/types.js";

// Exports rules
import { typeModuleRule } from "./exports/type-module.js";
import { exportsFieldRule } from "./exports/exports-field.js";
import { dotEntryRule } from "./exports/dot-entry.js";
import { typesOrderRule } from "./exports/types-order.js";
import { importConditionRule } from "./exports/import-condition.js";
import { fileExistsRule } from "./exports/file-exists.js";
import { valueInvalidRule } from "./exports/value-invalid.js";
import { defaultLastRule } from "./exports/default-last.js";
import { moduleBeforeRequireRule } from "./exports/module-before-require.js";
import { importsFieldRule } from "./exports/imports-field.js";
import { jsxExtensionsRule } from "./exports/jsx-extensions.js";
import { formatMismatchRule } from "./exports/format-mismatch.js";
import { moduleEsmOnlyRule } from "./exports/module-esm-only.js";
import { fallbackArrayRule } from "./exports/fallback-array.js";
import { typesFormatRule } from "./exports/types-format.js";
import { conditionTypesRule } from "./exports/condition-types.js";
import { noDeprecatedSubpathRule } from "./exports/no-deprecated-subpath-mapping.js";
import { importsKeyInvalidRule } from "./exports/imports-key-invalid.js";
import { browserConflictRule } from "./exports/browser-conflict.js";
import { fileNotPublishedRule } from "./exports/file-not-published.js";
import { globMatchedFilesRule } from "./exports/glob-matched-files.js";
import { cjsEsmoduleInteropRule } from "./exports/cjs-esmodule-interop.js";
import { cjsDefaultExportRule } from "./exports/cjs-default-export.js";
import { typesFirstRule } from "./exports/types-first.js";
import { esmMainNoExportsRule } from "./exports/esm-main-no-exports.js";
import { moduleNoExportsRule } from "./exports/module-no-exports.js";
import { typesNotExportedRule } from "./exports/types-not-exported.js";

// Types rules
import { tsconfigExistsRule } from "./types/tsconfig-exists.js";
import { declarationRule } from "./types/declaration.js";
import { strictRule } from "./types/strict.js";
import { moduleRule } from "./types/module.js";
import { moduleResolutionRule } from "./types/module-resolution.js";
import { isolatedModulesRule } from "./types/isolated-modules.js";
import { declarationCompletenessRule } from "./types/declaration-completeness.js";
import { noAnyExportRule } from "./types/no-any-export.js";
import { resolutionRule } from "./types/resolution.js";
import { falseCjsEsmRule } from "./types/false-cjs-esm.js";
import { falseExportDefaultRule } from "./types/false-export-default.js";
import { missingExportEqualsRule } from "./types/missing-export-equals.js";
import { esmDynamicOnlyRule } from "./types/esm-dynamic-only.js";

// Files rules
import { filesFieldRule } from "./files/files-field.js";
import { sensitiveRule } from "./files/sensitive.js";
import { binShebangRule } from "./files/bin-shebang.js";
import { allFilesFormatRule } from "./files/all-files-format.js";
import { prepublishRule } from "./files/prepublish.js";
import { duplicateDepRule } from "./files/duplicate-dep.js";
import { localDependencyRule } from "./files/local-dependency.js";
import { binExecutableRule } from "./files/bin-executable.js";
import { formatValidationRule } from "./files/format-validation.js";
import { implicitIndexFormatRule } from "./files/implicit-index-format.js";

// Metadata rules
import { licenseRule } from "./metadata/license.js";
import { licenseFileRule } from "./metadata/license-file.js";
import { repositoryRule } from "./metadata/repository.js";
import { enginesRule } from "./metadata/engines.js";
import { sideEffectsRule } from "./metadata/side-effects.js";
import { deprecatedFieldsRule } from "./metadata/deprecated-fields.js";
import { peerDepConflictRule } from "./metadata/peer-dep-conflict.js";
import { useExportsBrowserRule } from "./metadata/use-exports-browser.js";
import { repositoryFormatRule } from "./metadata/repository-format.js";

// Size rules
import { packageSizeRule } from "./size/package-size.js";

export const allRules: Rule[] = [
  // Exports
  typeModuleRule,
  exportsFieldRule,
  dotEntryRule,
  typesOrderRule,
  importConditionRule,
  fileExistsRule,
  valueInvalidRule,
  defaultLastRule,
  moduleBeforeRequireRule,
  importsFieldRule,
  jsxExtensionsRule,
  formatMismatchRule,
  moduleEsmOnlyRule,
  fallbackArrayRule,
  typesFormatRule,
  conditionTypesRule,
  noDeprecatedSubpathRule,
  importsKeyInvalidRule,
  browserConflictRule,
  fileNotPublishedRule,
  globMatchedFilesRule,
  cjsEsmoduleInteropRule,
  cjsDefaultExportRule,
  typesFirstRule,
  esmMainNoExportsRule,
  moduleNoExportsRule,
  typesNotExportedRule,

  // Types
  tsconfigExistsRule,
  declarationRule,
  strictRule,
  moduleRule,
  moduleResolutionRule,
  isolatedModulesRule,
  declarationCompletenessRule,
  noAnyExportRule,
  resolutionRule,
  falseCjsEsmRule,
  falseExportDefaultRule,
  missingExportEqualsRule,
  esmDynamicOnlyRule,

  // Files
  filesFieldRule,
  sensitiveRule,
  prepublishRule,
  duplicateDepRule,
  binShebangRule,
  allFilesFormatRule,
  localDependencyRule,
  binExecutableRule,
  formatValidationRule,
  implicitIndexFormatRule,

  // Metadata
  licenseRule,
  licenseFileRule,
  repositoryRule,
  enginesRule,
  sideEffectsRule,
  peerDepConflictRule,
  deprecatedFieldsRule,
  useExportsBrowserRule,
  repositoryFormatRule,

  // Size
  packageSizeRule,
];
