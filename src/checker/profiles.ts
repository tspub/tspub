import type { Severity } from "./framework/types.js";

/**
 * Profile definitions.
 * - `strict`: empty array = no rules skipped (everything is an error via strict flag)
 * - `library`: deny-list of rule IDs to skip
 * - `app`: allow-list of rule IDs to keep — all other rules are skipped.
 *   Uses `_appAllowList` flag so the CLI can invert it automatically.
 */
export const PROFILES: Record<string, string[]> = {
  strict: [], // no rules skipped — everything is an error (handled via strict flag)
  library: ["size/package-size"], // libraries don't need size checks
  app: [
    // App profiles only care about files, metadata, and size — not exports or type resolution
    "files/sensitive", "files/bin-executable", "files/bin-shebang",
    "files/duplicate-dep", "files/files-field", "files/format-validation",
    "files/local-dependency", "files/prepublish",
    "metadata/license", "metadata/license-file", "metadata/engines",
    "metadata/repository", "metadata/repository-format", "metadata/deprecated-fields",
    "metadata/peer-dep-conflict", "metadata/side-effects",
    "size/package-size",
  ],
};

/** Profiles listed here use allow-list semantics (only listed rules run). Others use deny-list (listed rules are skipped). */
export const ALLOW_LIST_PROFILES = new Set<string>(["app"]);

export const RULE_MAPPING: Record<string, { publint?: string; attw?: string }> = {
  // Exports
  "exports/type-module": { publint: "USE_TYPE" },
  "exports/exports-field": { publint: "HAS_ESM_MAIN_BUT_NO_EXPORTS" },
  "exports/dot-entry": { publint: "EXPORTS_MISSING_ROOT_ENTRYPOINT" },
  "exports/types-order": { publint: "EXPORTS_TYPES_SHOULD_BE_FIRST" },
  "exports/import-condition": { publint: "HAS_MODULE_BUT_NO_EXPORTS" },
  "exports/file-exists": { publint: "FILE_DOES_NOT_EXIST" },
  "exports/value-invalid": { publint: "EXPORTS_VALUE_INVALID" },
  "exports/default-last": { publint: "EXPORTS_DEFAULT_SHOULD_BE_LAST" },
  "exports/module-before-require": { publint: "EXPORTS_MODULE_SHOULD_PRECEDE_REQUIRE" },
  "exports/module-esm-only": { publint: "EXPORTS_MODULE_SHOULD_BE_ESM" },
  "exports/fallback-array": { publint: "EXPORTS_FALLBACK_ARRAY_USE" },
  "exports/format-mismatch": { publint: "FILE_INVALID_FORMAT" },
  "exports/types-format": { publint: "EXPORTS_TYPES_INVALID_FORMAT" },
  "exports/no-deprecated-subpath": { publint: "EXPORTS_GLOB_NO_DEPRECATED_SUBPATH_MAPPING" },
  "exports/browser-conflict": { publint: "USE_EXPORTS_BROWSER" },
  "exports/browser-value-conflict": { publint: "EXPORTS_VALUE_CONFLICTS_WITH_BROWSER" },
  "exports/types-first": { publint: "EXPORTS_TYPES_SHOULD_BE_FIRST" },
  "exports/esm-main-no-exports": { publint: "HAS_ESM_MAIN_BUT_NO_EXPORTS" },
  "exports/module-no-exports": { publint: "HAS_MODULE_BUT_NO_EXPORTS" },
  "exports/types-not-exported": { publint: "TYPES_NOT_EXPORTED" },
  "exports/file-not-published": { publint: "FILE_NOT_PUBLISHED" },
  "exports/glob-matched-files": { publint: "EXPORTS_GLOB_NO_MATCHED_FILES" },
  "exports/cjs-esmodule-interop": { publint: "CJS_WITH_ESMODULE_DEFAULT_EXPORT" },
  "exports/jsx-extensions": { publint: "FILE_INVALID_JSX_EXTENSION" },
  "exports/imports-key-invalid": { publint: "IMPORTS_KEY_INVALID" },
  "exports/imports-field": { publint: "IMPORTS_VALUE_INVALID" },
  // Imports
  "imports/default-last": { publint: "IMPORTS_DEFAULT_SHOULD_BE_LAST" },
  "imports/module-esm-only": { publint: "IMPORTS_MODULE_SHOULD_BE_ESM" },
  "imports/module-before-require": { publint: "IMPORTS_MODULE_SHOULD_PRECEDE_REQUIRE" },
  "imports/fallback-array": { publint: "IMPORTS_FALLBACK_ARRAY_USE" },
  "imports/glob-matched-files": { publint: "IMPORTS_GLOB_NO_MATCHED_FILES" },
  "imports/no-deprecated-subpath": { publint: "IMPORTS_GLOB_NO_DEPRECATED_SUBPATH_MAPPING" },
  // Types
  "types/false-cjs-esm": { attw: "FalseCJS / FalseESM" },
  "types/false-export-default": { attw: "FalseExportDefault" },
  "types/missing-export-equals": { attw: "MissingExportEquals" },
  "types/esm-dynamic-only": { attw: "ESMDynamicImportOnly" },
  "types/cjs-resolves-esm": { attw: "CJSResolvesToESM" },
  "types/resolution": { attw: "Resolution" },
  // Files
  "files/bin-shebang": {},
  "files/format-validation": { publint: "FILE_INVALID_FORMAT" },
  "files/bin-executable": { publint: "BIN_FILE_NOT_EXECUTABLE" },
  "files/files-field": { publint: "USE_FILES" },
  "files/local-dependency": { publint: "LOCAL_DEPENDENCY" },
  "files/implicit-index-format": { publint: "IMPLICIT_INDEX_JS_INVALID_FORMAT" },
  // Metadata
  "metadata/deprecated-fields": { publint: "DEPRECATED_FIELD_JSNEXT" },
  "metadata/repository-format": { publint: "INVALID_REPOSITORY_VALUE" },
  "metadata/license": { publint: "USE_LICENSE" },
  "metadata/field-value-type": { publint: "FIELD_INVALID_VALUE_TYPE" },
  "metadata/module-esm": { publint: "MODULE_SHOULD_BE_ESM" },
};

export const CATEGORY_ORDER = ["exports", "imports", "types", "files", "metadata", "size"];

export function parseSeverityOverrides(
  specs: string[],
): Record<string, Severity | "off"> {
  const overrides: Record<string, Severity | "off"> = {};
  for (const spec of specs) {
    const eqIdx = spec.indexOf("=");
    if (eqIdx === -1) continue;
    const ruleId = spec.slice(0, eqIdx).trim();
    const value = spec.slice(eqIdx + 1).trim() as Severity | "off";
    if (["error", "warning", "info", "off"].includes(value)) {
      overrides[ruleId] = value;
    }
  }
  return overrides;
}
