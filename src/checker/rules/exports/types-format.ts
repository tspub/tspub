import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const typesFormatRule: Rule = {
  meta: {
    id: "exports/types-format",
    description:
      "Check that types conditions use the correct .d.mts/.d.cts extensions for dual packages",
    defaultSeverity: "warning",
    fixable: false,
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports || typeof ctx.pkg.exports === "string") return [];
    const isModuleType = ctx.pkg.type === "module";
    const results: RawDiagnostic[] = [];

    function checkConditionMap(
      subpath: string,
      obj: Record<string, unknown>,
    ): void {
      const keys = Object.keys(obj);
      const hasImport = "import" in obj;
      const hasRequire = "require" in obj;

      // Check nested types under import when dual publishing
      if (hasImport && hasRequire && typeof obj["import"] === "object" && obj["import"] !== null) {
        const importObj = obj["import"] as Record<string, unknown>;
        if (typeof importObj["types"] === "string") {
          const typesPath = importObj["types"];
          // When "type": "module", .d.ts is already interpreted as ESM
          if (
            !isModuleType &&
            typesPath.endsWith(".d.ts") &&
            !typesPath.endsWith(".d.mts")
          ) {
            results.push({
              severity: "warning",
              message: `exports "${subpath}" → import.types is "${typesPath}" which is interpreted as CJS — consider using .d.mts for ESM types`,
            });
          }
        }
      }

      // Top-level types with both import and require (dual publish)
      if (hasImport && hasRequire && typeof obj["types"] === "string") {
        const typesPath = obj["types"] as string;
        // When "type": "module", .d.ts is already interpreted as ESM
        if (
          !isModuleType &&
          typesPath.endsWith(".d.ts") &&
          !typesPath.endsWith(".d.mts") &&
          !typesPath.endsWith(".d.cts")
        ) {
          results.push({
            severity: "warning",
            message: `exports "${subpath}" types is "${typesPath}" — ambiguous for the "import" condition. Consider splitting into import/require-specific types with .d.mts/.d.cts extensions`,
          });
        }
      }

      // Recurse into subpath values
      for (const key of keys) {
        const val = obj[key];
        if (
          typeof val === "object" &&
          val !== null &&
          !Array.isArray(val) &&
          key !== "import" &&
          key !== "require"
        ) {
          // Could be a subpath or a nested condition map
          checkConditionMap(
            key.startsWith(".") ? key : subpath,
            val as Record<string, unknown>,
          );
        }
      }
    }

    const exports = ctx.pkg.exports as Record<string, unknown>;
    const keys = Object.keys(exports);
    const hasSubpaths = keys.some((k) => k.startsWith("."));

    if (hasSubpaths) {
      for (const key of keys) {
        const val = exports[key];
        if (typeof val === "object" && val !== null) {
          checkConditionMap(key, val as Record<string, unknown>);
        }
      }
    } else {
      // Sugar form — top-level is the condition map
      checkConditionMap(".", exports);
    }

    return results;
  },
};
