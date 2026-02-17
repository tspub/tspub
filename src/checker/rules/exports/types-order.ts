import type { Rule, RawDiagnostic } from "../../framework/types.js";

export const typesOrderRule: Rule = {
  meta: {
    id: "exports/types-order",
    description: "Check that types condition comes before default in exports",
    defaultSeverity: "warning",
    fixable: "safe",
    category: "exports",
  },
  check(ctx) {
    if (!ctx.pkg.exports) return [];
    if (typeof ctx.pkg.exports === "string") return [];
    const results: RawDiagnostic[] = [];

    let mainExport = ctx.pkg.exports["."];
    if (!mainExport) {
      // Check for sugar form
      const keys = Object.keys(ctx.pkg.exports);
      const isConditionMap =
        !keys.some((k) => k.startsWith("./")) &&
        keys.some((k) =>
          ["types", "import", "require", "default", "node", "browser"].includes(k),
        );
      if (isConditionMap) mainExport = ctx.pkg.exports;
      else return [];
    }
    if (typeof mainExport !== "object" || mainExport === null) return [];

    const mainObj = mainExport as Record<string, unknown>;

    // Check flat condition map ordering
    if ("types" in mainObj && typeof mainObj["types"] === "string") {
      const keys = Object.keys(mainObj);
      const typesIdx = keys.indexOf("types");
      const importIdx = keys.indexOf("import");
      const requireIdx = keys.indexOf("require");
      const defaultIdx = keys.indexOf("default");
      const nonTypesIndices = [importIdx, requireIdx, defaultIdx].filter((i) => i > -1);
      if (nonTypesIndices.length > 0 && typesIdx > -1) {
        const firstNonTypes = Math.min(...nonTypesIndices);
        if (typesIdx > firstNonTypes) {
          results.push({
            severity: "warning",
            message:
              'exports["."].types should come BEFORE import/require/default',
          });
        }
      }
    }

    // Check nested import condition ordering
    const importCondition = mainObj["import"];
    if (typeof importCondition === "object" && importCondition !== null) {
      const importObj = importCondition as Record<string, string>;
      const keys = Object.keys(importObj);
      const typesIndex = keys.indexOf("types");
      const defaultIndex = keys.indexOf("default");
      if (
        typesIndex > -1 &&
        defaultIndex > -1 &&
        typesIndex > defaultIndex
      ) {
        results.push({
          severity: "warning",
          message:
            'exports["."].import.types should come BEFORE default',
        });
      }
    }

    // Check nested require condition ordering
    const requireCondition = mainObj["require"];
    if (typeof requireCondition === "object" && requireCondition !== null) {
      const keys = Object.keys(
        requireCondition as Record<string, unknown>,
      );
      const typesIndex = keys.indexOf("types");
      const defaultIndex = keys.indexOf("default");
      if (
        typesIndex > -1 &&
        defaultIndex > -1 &&
        typesIndex > defaultIndex
      ) {
        results.push({
          severity: "warning",
          message:
            'exports["."].require.types should come BEFORE default',
        });
      }
    }

    return results;
  },
  fix(ctx) {
    if (!ctx.pkg.exports || typeof ctx.pkg.exports === "string") {
      return { message: "", pkgModified: false };
    }

    let mainExport: Record<string, unknown> | undefined;
    const dot = ctx.pkg.exports["."];

    if (typeof dot === "object" && dot !== null) {
      mainExport = dot as Record<string, unknown>;
    } else {
      // Check for sugar form (flat condition map at top level)
      const keys = Object.keys(ctx.pkg.exports);
      const isConditionMap =
        !keys.some((k) => k.startsWith("./")) &&
        keys.some((k) =>
          ["types", "import", "require", "default", "node", "browser"].includes(k),
        );
      if (isConditionMap) mainExport = ctx.pkg.exports as Record<string, unknown>;
    }

    if (!mainExport) return { message: "", pkgModified: false };

    let modified = false;

    // Fix flat condition map ordering (types before import/require/default)
    if ("types" in mainExport && typeof mainExport["types"] === "string") {
      const keys = Object.keys(mainExport);
      const typesIdx = keys.indexOf("types");
      const firstNonTypes = Math.min(
        ...[keys.indexOf("import"), keys.indexOf("require"), keys.indexOf("default")].filter((i) => i > -1),
      );
      if (typesIdx > -1 && firstNonTypes > -1 && typesIdx > firstNonTypes) {
        const reordered: Record<string, unknown> = {};
        reordered["types"] = mainExport["types"];
        for (const key of keys) {
          if (key !== "types") reordered[key] = mainExport[key];
        }
        // Replace in-place
        for (const key of keys) delete mainExport[key];
        Object.assign(mainExport, reordered);
        modified = true;
      }
    }

    // Fix nested import/require condition ordering
    for (const condition of ["import", "require"]) {
      const cond = mainExport[condition] as
        | Record<string, string>
        | undefined;
      if (cond && typeof cond === "object" && "types" in cond && "default" in cond) {
        const keys = Object.keys(cond);
        const typesIdx = keys.indexOf("types");
        const defaultIdx = keys.indexOf("default");
        if (typesIdx > defaultIdx) {
          const reordered: Record<string, string> = {};
          reordered["types"] = cond["types"]!;
          for (const key of keys) {
            if (key !== "types") reordered[key] = cond[key]!;
          }
          mainExport[condition] = reordered;
          modified = true;
        }
      }
    }

    if (!modified) return { message: "", pkgModified: false };
    return {
      message: "reordered exports (types before default)",
      pkgModified: true,
    };
  },
};
