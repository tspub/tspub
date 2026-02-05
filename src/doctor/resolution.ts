import type { PackageJson } from "../shared/package-json.js";

export interface ResolutionDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
}

export function debugResolution(
  pkg: PackageJson,
  subpath: string,
): ResolutionDiagnostic[] {
  const results: ResolutionDiagnostic[] = [];
  const normalizedSubpath = subpath.startsWith(".")
    ? subpath
    : `./${subpath}`;

  if (!pkg.exports) {
    results.push({
      severity: "error",
      message:
        'No "exports" field in package.json. Add exports to enable subpath resolution.',
    });
    return results;
  }

  const exports = pkg.exports as Record<string, unknown>;

  if (!(normalizedSubpath in exports)) {
    results.push({
      severity: "error",
      message: `Subpath "${normalizedSubpath}" not found in exports. Available: ${Object.keys(exports).join(", ")}`,
    });

    // Suggest adding
    results.push({
      severity: "info",
      message: `Add "${normalizedSubpath}" to your package.json exports field.`,
    });
    return results;
  }

  const entry = exports[normalizedSubpath];
  if (typeof entry === "string") {
    results.push({
      severity: "info",
      message: `"${normalizedSubpath}" resolves to: ${entry}`,
    });
  } else if (entry && typeof entry === "object") {
    const conditions = Object.keys(entry as Record<string, unknown>);
    results.push({
      severity: "info",
      message: `"${normalizedSubpath}" has conditions: ${conditions.join(", ")}`,
    });

    // Check for missing types condition
    if (!conditions.includes("types") && typeof entry === "object") {
      const nested = entry as Record<string, unknown>;
      const hasNestedTypes = Object.values(nested).some(
        (v) =>
          typeof v === "object" &&
          v !== null &&
          "types" in (v as Record<string, unknown>),
      );
      if (!hasNestedTypes) {
        results.push({
          severity: "warning",
          message: `"${normalizedSubpath}" is missing a "types" condition. TypeScript users may not resolve types.`,
        });
      }
    }
  }

  return results;
}
